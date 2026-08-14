import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set. Email functionality will be disabled.');
      return;
    }
    this.resend = new Resend(apiKey);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn('Email service not configured. Skipping email send.');
      return;
    }

    try {
      await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@redscroller.com',
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async sendJoinRequestNotification(adminEmail: string, requesterName: string, firmName: string) {
    const subject = `New join request for ${firmName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f20d1a;">New Join Request</h2>
        <p><strong>${requesterName}</strong> has requested to join your firm <strong>${firmName}</strong>.</p>
        <p>Please review and approve or decline this request in the Team Settings page.</p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    await this.sendEmail(adminEmail, subject, html);
  }

  async sendJoinRequestApproved(userEmail: string, firmName: string) {
    const subject = `Your request to join ${firmName} has been approved`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7ee2b8;">Request Approved</h2>
        <p>Great news! Your request to join <strong>${firmName}</strong> has been approved.</p>
        <p>You can now access the firm workspace and start collaborating with your team.</p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendJoinRequestDeclined(userEmail: string, firmName: string) {
    const subject = `Your request to join ${firmName} has been declined`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f20d1a;">Request Declined</h2>
        <p>Your request to join <strong>${firmName}</strong> has been declined.</p>
        <p>If you believe this is an error, please contact your firm administrator.</p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendMatterAccessGranted(userEmail: string, matterTitle: string, firmName: string) {
    const subject = `Access granted to matter: ${matterTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7ee2b8;">Matter Access Granted</h2>
        <p>You have been granted access to the restricted matter <strong>${matterTitle}</strong> in <strong>${firmName}</strong>.</p>
        <p>You can now view and work on this matter in your dashboard.</p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    await this.sendEmail(userEmail, subject, html);
  }

  async sendDocumentUploaded(userEmails: string[], documentName: string, matterTitle: string, uploaderName: string) {
    const subject = `New document uploaded: ${documentName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f20d1a;">New Document Uploaded</h2>
        <p><strong>${uploaderName}</strong> uploaded a new document:</p>
        <p><strong>${documentName}</strong></p>
        <p>For matter: <strong>${matterTitle}</strong></p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    
    for (const email of userEmails) {
      await this.sendEmail(email, subject, html);
    }
  }

  async sendDiaryReminder(userEmail: string, eventTitle: string, eventType: string, eventDate: Date) {
    const subject = `Reminder: ${eventType} - ${eventTitle}`;
    const formattedDate = eventDate.toLocaleString();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f20d1a;">Upcoming Event Reminder</h2>
        <p>This is a reminder for your upcoming event:</p>
        <p><strong>${eventTitle}</strong></p>
        <p><strong>Type:</strong> ${eventType}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p style="color: #666; font-size: 14px;">This is an automated notification from RedScroller.</p>
      </div>
    `;
    await this.sendEmail(userEmail, subject, html);
  }
}
