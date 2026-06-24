-- Defense-in-depth for the lock-before-reveal invariant (plan/04: "ideally a DB
-- trigger/check"). Once a ReviewSubmission is locked (lockedAt IS NOT NULL), its
-- QuestionAnswer / MetricRating rows are immutable at the database level — no code
-- path (buggy or otherwise) can alter a submitted review.
--
-- Safe for the normal flow: submit() writes the answers/ratings while the submission
-- is still a draft (lockedAt NULL), THEN the state machine locks it. No writes occur
-- after lock, so this trigger never fires on the happy path.

CREATE OR REPLACE FUNCTION enforce_submission_locked() RETURNS trigger AS $$
DECLARE
  sub_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    sub_id := OLD."submissionId";
  ELSE
    sub_id := NEW."submissionId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM "ReviewSubmission" WHERE id = sub_id AND "lockedAt" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ReviewSubmission % is locked; its answers/ratings are immutable', sub_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER question_answer_locked_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON "QuestionAnswer"
  FOR EACH ROW EXECUTE FUNCTION enforce_submission_locked();

CREATE TRIGGER metric_rating_locked_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON "MetricRating"
  FOR EACH ROW EXECUTE FUNCTION enforce_submission_locked();
