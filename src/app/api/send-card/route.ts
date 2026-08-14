import { NextResponse } from "next/server";
import { after } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, cardPdf } = await request.json();

    // =========================================
    // VALIDATE EMAIL
    // =========================================

    if (
      !email ||
      !email.includes("@") ||
      !email.includes(".")
    ) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    // =========================================
    // VALIDATE PDF
    // =========================================

    if (
      !cardPdf ||
      typeof cardPdf !== "string"
    ) {
      console.error("NO PDF RECEIVED FROM CLIENT");

      return NextResponse.json(
        {
          error: "Card PDF was not received.",
        },
        { status: 400 }
      );
    }

    console.log(
      "PDF RECEIVED. Base64 length:",
      cardPdf.length
    );

    // =========================================
    // CHECK RESEND API KEY
    // =========================================

    if (!process.env.RESEND_API_KEY) {
      console.error(
        "RESEND_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error: "Resend API key is missing.",
        },
        { status: 500 }
      );
    }

    // =========================================
    // SEND EMAIL AFTER RESPONSE
    // =========================================

    after(async () => {
      try {
        const resend = new Resend(
          process.env.RESEND_API_KEY
        );

        console.log(
          "Sending TWO-SIDED PDF to:",
          email
        );

        const { data, error } =
          await resend.emails.send({
            from:
              "Krinsh Panchal <card@krinshpanchal.in>",

            to: [email],

            subject:
              "Great meeting you at Mumbai Gifting Fair 2026 👋",

            html: `
              <div style="
                max-width: 600px;
                margin: auto;
                padding: 30px;
                font-family: Arial, sans-serif;
                color: #222;
              ">

                <h2>
                  👋 Great meeting you!
                </h2>

                <p>
                  It was great connecting with you.
                </p>

                <p>
                  I'm <strong>Krinsh Panchal</strong>.
                </p>

                <p>
                  Thank you for taking the time
                  to connect with me.
                </p>

                <hr style="
                  margin: 25px 0;
                  border: 0;
                  border-top: 1px solid #ddd;
                " />

                <h3>
                  About Me
                </h3>

                <p>
                  I work in premium clothing,
                  corporate uniforms,
                  custom merchandise and
                  creative solutions.
                </p>

                <p>
                  <strong>NOVASPACE</strong><br />
                  <strong>HIRMIVERSE</strong>
                </p>

                <p>
                  My digital visiting card is
                  attached to this email.
                </p>

                <p>
                  Let's stay connected.
                </p>

                <p>
                  Regards,<br />
                  <strong>Krinsh Panchal</strong>
                </p>

              </div>
            `,

            attachments: [
              {
                filename:
                  "Krinsh-Panchal-Digital-Card.pdf",

                content: cardPdf,
              },
            ],
          });

        if (error) {
          console.error(
            "RESEND ERROR:",
            error
          );
          return;
        }

        console.log(
          "TWO-SIDED PDF EMAIL SENT:",
          data
        );

      } catch (error) {
        console.error(
          "BACKGROUND EMAIL ERROR:",
          error
        );
      }
    });

    // =========================================
    // RESPOND IMMEDIATELY
    // =========================================

    return NextResponse.json({
      success: true,
      message:
        "Card downloaded. Email is being sent.",
    });

  } catch (error) {
    console.error(
      "EMAIL API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process your request.",
      },
      { status: 500 }
    );
  }
}