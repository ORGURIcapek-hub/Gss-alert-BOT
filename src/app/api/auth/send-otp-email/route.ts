import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { email, otp, userName } = await req.json()

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const recipientName = userName || 'ผู้ใช้งาน'
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 465
    const smtpSecure = process.env.SMTP_SECURE === 'false' ? false : true
    const smtpFrom = process.env.SMTP_FROM || `"ระบบติดตาม OKR มหาวิทยาลัยสวนดุสิต" <${smtpUser || 'noreply@dusit.ac.th'}>`

    // Styled HTML Email Template matching SDU Branding
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>รหัส OTP สำหรับรีเซ็ตรหัสผ่าน</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #00264D 0%, #003B71 60%, #00A8B5 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #bae6fd; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #f8fafc; border: 2px dashed #003B71; border-radius: 16px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px; }
        .otp-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #003B71; letter-spacing: 8px; margin: 4px 0; }
        .otp-expiry { font-size: 12px; color: #e11d48; font-weight: 600; margin-top: 8px; }
        .security-notice { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #991b1b; line-height: 1.5; margin-top: 24px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>มหาวิทยาลัยสวนดุสิต</h1>
          <p>ระบบติดตามและประเมินผล OKR (GSS-Alert OKR Bot)</p>
        </div>
        <div class="content">
          <div class="greeting">เรียน คุณ${recipientName},</div>
          <div class="message">
            ระบบได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี <strong>${email}</strong> ของคุณ<br>
            กรุณาใช้รหัสยืนยัน OTP ด้านล่างนี้เพื่อดำเนินการกำหนดรหัสผ่านใหม่:
          </div>

          <div class="otp-box">
            <div class="otp-label">รหัสยืนยันตัวตน (OTP Code)</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏱️ รหัสนี้มีอายุการใช้งาน 5 นาที</div>
          </div>

          <div class="security-notice">
            <strong>คำแนะนำด้านความปลอดภัย:</strong><br>
            ห้ามเปิดเผยรหัสนี้แก่ผู้อื่นโดยเด็ดขาด หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้ หรือติดต่อผู้ดูแลระบบเพื่อความปลอดภัยของบัญชี
          </div>
        </div>
        <div class="footer">
          © มหาวิทยาลัยสวนดุสิต (Suan Dusit University)<br>
          อีเมลนี้เป็นการแจ้งเตือนอัตโนมัติ กรุณาอย่าตอบกลับ
        </div>
      </div>
    </body>
    </html>
    `

    // Check if real SMTP credentials are provided
    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: `[SDU OKR] รหัส OTP สำหรับรีเซ็ตรหัสผ่านของคุณคือ ${otp}`,
        text: `เรียน คุณ${recipientName},\n\nรหัส OTP สำหรับรีเซ็ตรหัสผ่านของคุณคือ: ${otp}\n(รหัสมีอายุการใช้งาน 5 นาที)\n\nหากคุณไม่ได้ส่งคำขอนี้ กรุณาเพิกเฉยต่ออีเมลนี้`,
        html: htmlContent
      })

      return NextResponse.json({
        success: true,
        isRealEmail: true,
        messageId: info.messageId,
        message: `ส่งอีเมลจริงไปยัง ${email} สำเร็จเรียบร้อยแล้ว`
      })
    } else {
      // SMTP is not configured yet in .env
      console.warn(`[send-otp-email] SMTP_USER / SMTP_PASS not set. Simulated OTP: ${otp} for ${email}`)
      return NextResponse.json({
        success: true,
        isRealEmail: false,
        warning: 'SMTP_USER or SMTP_PASS not configured in .env.local. Simulated email delivery.',
        message: `จำลองการส่งรหัส OTP สำเร็จ (เนื่องจากยังไม่ได้กำหนด SMTP_USER / SMTP_PASS ใน .env.local)`
      })
    }
  } catch (error: any) {
    console.error('[send-otp-email] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to send OTP email',
        isRealEmail: false
      },
      { status: 500 }
    )
  }
}
