export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface IMailerService {
  sendMail(opts: SendMailOptions): Promise<void>;
}
