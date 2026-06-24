# Phase 1 real-DB end-to-end smoke test.
# Prereq: the full stack is running — Docker (Postgres + Mailpit) up, `pnpm db:migrate`,
# and `pnpm dev:api` + `pnpm dev:web` (API on :3000). Then run:
#   pwsh -File scripts/integration-smoke.ps1   (or: powershell -File scripts\integration-smoke.ps1)
# It drives the full review cycle as admin/mentee/mentor and asserts every critical invariant
# (lock-before-reveal, reveal-after-both, mentor-hidden-until-release, reminder idempotency,
# anonymous-feedback suppression, admin-only dashboard) + checks Mailpit. Exits non-zero on any failure.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$pass = 0; $fail = 0
function Ok($m){ $script:pass++; Write-Host "  PASS: $m" -ForegroundColor Green }
function Bad($m){ $script:fail++; Write-Host "  FAIL: $m" -ForegroundColor Red }
function Check($cond,$m){ if($cond){ Ok $m } else { Bad $m } }

function Login($email,$password){
  $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $csrf = (Invoke-RestMethod "$base/auth/csrf" -WebSession $s).csrfToken
  $body = @{ email=$email; password=$password } | ConvertTo-Json
  $u = Invoke-RestMethod "$base/auth/login" -Method Post -Body $body -ContentType 'application/json' -Headers @{'x-csrf-token'=$csrf} -WebSession $s
  return @{ S=$s; C=$csrf; User=$u.user }
}
function P($ctx,$path,$obj){
  $body = if($null -ne $obj){ $obj | ConvertTo-Json -Depth 10 } else { '{}' }
  return Invoke-RestMethod "$base$path" -Method Post -Body $body -ContentType 'application/json' -Headers @{'x-csrf-token'=$ctx.C} -WebSession $ctx.S
}
function PUT($ctx,$path,$obj){
  $body = $obj | ConvertTo-Json -Depth 10
  return Invoke-RestMethod "$base$path" -Method Put -Body $body -ContentType 'application/json' -Headers @{'x-csrf-token'=$ctx.C} -WebSession $ctx.S
}
function G($ctx,$path){ return Invoke-RestMethod "$base$path" -WebSession $ctx.S }
function Status($block){ try { & $block; return 200 } catch { return [int]$_.Exception.Response.StatusCode.value__ } }

$utc = [DateTime]::UtcNow.Date
function D($n){ return $utc.AddDays($n).ToString('yyyy-MM-dd') }
$sfx = (Get-Date -Format 'HHmmss')

$ANS = @(
 @{questionKey='overall_achievement'; answerText='Met most goals.'},
 @{questionKey='what_went_well'; answerText='Delivery and mentoring.'},
 @{questionKey='areas_to_improve'; answerText='Public speaking.'},
 @{questionKey='plan_next_year'; answerText='Lead a project.'})
function Ratings($base){ return @(
 @{metricKey='customer_satisfaction'; score=$base},
 @{metricKey='public_speaking'; score=$base},
 @{metricKey='deliverables'; score=$base},
 @{metricKey='mentoring_activity'; score=$base},
 @{metricKey='tech_community_events'; score=$base}) }

Write-Host "=== Login as admin ===" -ForegroundColor Cyan
$admin = Login 'admin@perf-tracker.local' 'ChangeMe123!'
Check ($admin.User.role -eq 'admin') "admin login"

Write-Host "=== Create mentee + mentor + pairing ===" -ForegroundColor Cyan
$mentee = P $admin '/admin/users' @{ email="mentee+$sfx@perf-tracker.local"; displayName="Mentee $sfx"; role='user'; password='ChangeMe123!' }
$mentor = P $admin '/admin/users' @{ email="mentor+$sfx@perf-tracker.local"; displayName="Mentor $sfx"; role='user'; password='ChangeMe123!' }
Check ($mentee.id -and $mentor.id) "created mentee + mentor"
$pair = P $admin '/admin/pairings' @{ menteeId=$mentee.id; mentorId=$mentor.id }
Check ($pair.id) "created pairing"

Write-Host "=== Cycle A: full lifecycle ===" -ForegroundColor Cyan
$cycA = P $admin '/cycles' @{ menteeId=$mentee.id; mentorId=$mentor.id; periodLabel="2026-A-$sfx"; goalsDueDate=(D 0); selfDueDate=(D 5); mentorDueDate=(D 10); cycleEndDate=(D 30) }
Check ($cycA.status -eq 'not_started') "cycle A created (not_started)"
$cycA = P $admin "/cycles/$($cycA.id)/transition" @{ to='goals_set' }
$cycA = P $admin "/cycles/$($cycA.id)/transition" @{ to='self_assessment_open' }
Check ($cycA.status -eq 'self_assessment_open') "opened self-assessment"

$menteeCtx = Login "mentee+$sfx@perf-tracker.local" 'ChangeMe123!'
$mentorCtx = Login "mentor+$sfx@perf-tracker.local" 'ChangeMe123!'

$st = Status { G $menteeCtx "/cycles/$($cycA.id)/comparison" }
Check ($st -eq 403) "INVARIANT comparison locked before both submit (403), got $st"

PUT $menteeCtx "/cycles/$($cycA.id)/submissions/self/draft" @{ answers=$ANS; ratings=(Ratings 3) } | Out-Null
$submitRes = P $menteeCtx "/cycles/$($cycA.id)/submissions/self/submit" @{ answers=$ANS; ratings=(Ratings 3) }
Check ($submitRes.cycle.status -eq 'mentor_assessment_open') "self submit auto-chained to mentor_assessment_open"
Check ($submitRes.submission.lockedAt) "self submission locked on submit"

$st = Status { PUT $menteeCtx "/cycles/$($cycA.id)/submissions/self/draft" @{ ratings=(Ratings 4) } }
Check ($st -eq 409) "INVARIANT locked submission immutable (409), got $st"

$st = Status { G $menteeCtx "/cycles/$($cycA.id)/submissions/mentor" }
Check ($st -eq 403) "INVARIANT mentee cannot read mentor side pre-release (403), got $st"

$mSub = P $mentorCtx "/cycles/$($cycA.id)/submissions/mentor/submit" @{ answers=$ANS; ratings=(Ratings 4) }
Check ($mSub.cycle.status -eq 'mentor_submitted') "mentor submit -> mentor_submitted"

$cmpMentor = G $mentorCtx "/cycles/$($cycA.id)/comparison"
Check ($cmpMentor.self -and $cmpMentor.mentor) "mentor sees BOTH sides after both submit"
$gap = $cmpMentor.gaps | Where-Object { $_.metricKey -eq 'deliverables' }
Check ($gap.selfScore -eq 3 -and $gap.mentorScore -eq 4 -and $gap.delta -eq 1) "gap analysis self=3 mentor=4 delta=1"

$cmpMenteePre = G $menteeCtx "/cycles/$($cycA.id)/comparison"
Check ($cmpMenteePre.releaseGated -eq $true -and $null -eq $cmpMenteePre.mentor) "INVARIANT mentor side hidden from employee pre-release"

P $mentorCtx "/cycles/$($cycA.id)/transition" @{ to='meeting_scheduled'; meeting=@{ scheduledStart=(D 12)+'T15:00:00Z'; scheduledEnd=(D 12)+'T15:30:00Z'; teamsJoinUrl='https://teams.microsoft.com/l/meetup-join/test' } } | Out-Null
$cycA = P $mentorCtx "/cycles/$($cycA.id)/transition" @{ to='meeting_held' }
Check ($cycA.status -eq 'meeting_held') "meeting scheduled + held"
$cycA = P $mentorCtx "/cycles/$($cycA.id)/release"
Check ($cycA.status -eq 'released_to_employee') "released to employee"

$cmpMenteePost = G $menteeCtx "/cycles/$($cycA.id)/comparison"
Check ($null -ne $cmpMenteePost.mentor) "INVARIANT employee sees mentor side AFTER release"
$cycA = P $menteeCtx "/cycles/$($cycA.id)/acknowledge" @{ comment='Thanks, agreed on growth areas.' }
Check ($cycA.status -eq 'closed') "acknowledge auto-closed the cycle"

Write-Host "=== Notifications ===" -ForegroundColor Cyan
$menteeNotifs = G $menteeCtx '/notifications'
Check ($menteeNotifs.items.Count -ge 1) "mentee has in-app notifications ($($menteeNotifs.items.Count))"
$hasReleased = $menteeNotifs.items | Where-Object { $_.type -eq 'review_released' }
Check ($hasReleased) "mentee got review_released notification"

Write-Host "=== Cycle B + reminder sweep + idempotency ===" -ForegroundColor Cyan
$cycB = P $admin '/cycles' @{ menteeId=$mentee.id; mentorId=$mentor.id; periodLabel="2026-B-$sfx"; goalsDueDate=(D 0); selfDueDate=(D 3); mentorDueDate=(D 9); cycleEndDate=(D 30) }
P $admin "/cycles/$($cycB.id)/transition" @{ to='goals_set' } | Out-Null
P $admin "/cycles/$($cycB.id)/transition" @{ to='self_assessment_open' } | Out-Null

$sweep1 = P $admin '/jobs/run-reminder-sweep' $null
Write-Host "  sweep1: $($sweep1 | ConvertTo-Json -Compress)"
$countAfter1 = (G $menteeCtx '/notifications').items.Count
$mentorCount1 = (G $mentorCtx '/notifications').items.Count
$sweep2 = P $admin '/jobs/run-reminder-sweep' $null
$countAfter2 = (G $menteeCtx '/notifications').items.Count
$mentorCount2 = (G $mentorCtx '/notifications').items.Count
Check ($countAfter1 -eq $countAfter2 -and $mentorCount1 -eq $mentorCount2) "INVARIANT reminder sweep idempotent (mentee $countAfter1->$countAfter2, mentor $mentorCount1->$mentorCount2)"
$cycleEnding = (G $mentorCtx '/notifications').items | Where-Object { $_.type -eq 'cycle_ending' }
Check ($cycleEnding) "mentor got cycle_ending (T-30) reminder"

Write-Host "=== Appreciation + Feedback smoke ===" -ForegroundColor Cyan
$appr = P $menteeCtx '/appreciation' @{ message='Great mentoring!'; recipientUserIds=@($mentor.id); metricTag='mentoring_activity' }
Check ($appr.id -and $appr.recipients.Count -eq 1) "appreciation posted"
$fbReq = P $mentorCtx '/feedback/requests' @{ targetUserId=$mentee.id; prompt='How can I improve as a mentor?'; anonymity=$true }
$resp = P $menteeCtx "/feedback/requests/$($fbReq.id)/respond" @{ body='More frequent check-ins.' }
Check ($resp.status -eq 'completed') "feedback responded"
$sent = G $mentorCtx '/feedback/requests?box=sent'
$sentReq = $sent | Where-Object { $_.id -eq $fbReq.id }
Check ($sentReq.responses[0].authorName -eq $null) "INVARIANT anonymous feedback suppresses responder name"

Write-Host "=== Admin dashboard ===" -ForegroundColor Cyan
$dash = G $admin '/dashboard/overview'
Check ($dash.metrics.Count -eq 5) "dashboard returns all 5 metrics"
$deliv = $dash.metrics | Where-Object { $_.metricKey -eq 'deliverables' }
Check ($deliv.self.n -ge 1 -and $deliv.mentor.n -ge 1) "dashboard has self+mentor ratings for deliverables"
$st = Status { G $menteeCtx '/dashboard/overview' }
Check ($st -eq 403) "INVARIANT dashboard admin-only (403 for user), got $st"

Write-Host "=== Mailpit ===" -ForegroundColor Cyan
try {
  $mp = Invoke-RestMethod 'http://localhost:8025/api/v1/messages'
  Check ($mp.total -ge 1) "Mailpit received emails (total=$($mp.total))"
} catch { Bad "Mailpit query failed: $_" }

Write-Host ""
$color = 'Green'; if($fail -gt 0){ $color = 'Red' }
Write-Host "RESULT: $pass passed, $fail failed" -ForegroundColor $color
if($fail -gt 0){ exit 1 }
