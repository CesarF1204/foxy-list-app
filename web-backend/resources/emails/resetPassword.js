const resetPasswordTemplate = ({ email, resetUrl }) => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >
            <title>Reset your password</title>
        </head>

        <body
            style="
                margin: 0;
                padding: 0;
                background-color: #FBF4E9;
                font-family: Arial, Helvetica, sans-serif;
                color: #2B2119;
            "
        >
            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                    background-color: #FBF4E9;
                    padding: 40px 20px;
                "
            >
                <tr>
                    <td align="center">

                        <!-- Card -->
                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="
                                max-width: 560px;
                                background-color: #FFFFFF;
                                border: 2px solid #2B2119;
                                border-radius: 18px;
                            "
                        >
                            <tr>
                                <td
                                    style="
                                        padding: 40px;
                                        text-align: center;
                                    "
                                >

                                    <!-- Brand -->
                                    <div
                                        style="
                                            display: inline-block;
                                            background-color: #FFC894;
                                            border: 2px solid #2B2119;
                                            border-radius: 16px;
                                            padding: 18px 28px;
                                            margin-bottom: 28px;
                                        "
                                    >
                                        <span
                                            style="
                                                font-size: 25px;
                                                font-weight: 800;
                                                color: #2B2119;
                                            "
                                        >
                                            🦊 Foxy List
                                        </span>
                                    </div>

                                    <!-- Heading -->
                                    <h1
                                        style="
                                            margin: 0 0 12px;
                                            font-size: 28px;
                                            line-height: 1.2;
                                            font-weight: 800;
                                            color: #2B2119;
                                        "
                                    >
                                        Reset your password
                                    </h1>

                                    <!-- Greeting -->
                                    <p
                                        style="
                                            margin: 0 0 24px;
                                            font-size: 16px;
                                            line-height: 1.6;
                                            color: #6B5A4B;
                                        "
                                    >
                                        Hi ${email},
                                    </p>

                                    <p
                                        style="
                                            margin: 0 0 28px;
                                            font-size: 16px;
                                            line-height: 1.6;
                                            color: #6B5A4B;
                                        "
                                    >
                                        We received a request to reset the password
                                        for your Foxy List account.
                                    </p>

                                    <!-- CTA -->
                                    <table
                                        cellpadding="0"
                                        cellspacing="0"
                                        border="0"
                                        align="center"
                                        style="margin-bottom: 28px;"
                                    >
                                        <tr>
                                            <td
                                                align="center"
                                                style="
                                                    background-color: #F37C1F;
                                                    border: 2px solid #2B2119;
                                                    border-radius: 10px;
                                                "
                                            >
                                                <a
                                                    href="${resetUrl}"
                                                    style="
                                                        display: inline-block;
                                                        padding: 15px 34px;
                                                        font-size: 16px;
                                                        font-weight: 800;
                                                        color: #FFFFFF;
                                                        text-decoration: none;
                                                    "
                                                >
                                                    Reset my password
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Fallback URL -->
                                    <p
                                        style="
                                            margin: 28px 0 8px;
                                            font-size: 12px;
                                            line-height: 1.5;
                                            color: #6B5A4B;
                                        "
                                    >
                                        Having trouble with the button?
                                        Copy and paste this link into your browser:
                                    </p>

                                    <a
                                        href="${resetUrl}"
                                        style="
                                            font-size: 12px;
                                            line-height: 1.5;
                                            color: #F37C1F;
                                            word-break: break-all;
                                        "
                                    >
                                        ${resetUrl}
                                    </a>

                                    <!-- Divider -->
                                    <div
                                        style="
                                            height: 1px;
                                            background-color: #EDE8DC;
                                            margin: 32px 0 20px;
                                        "
                                    ></div>

                                    <!-- Footer -->
                                    <p
                                        style="
                                            margin: 0;
                                            font-size: 12px;
                                            line-height: 1.5;
                                            color: #6B5A4B;
                                        "
                                    >
                                        If you didn't request this password reset,
                                        no action is required.
                                    </p>

                                    <p
                                        style="
                                            margin: 14px 0 0;
                                            font-size: 12px;
                                            font-weight: 700;
                                            color: #2B2119;
                                        "
                                    >
                                        Foxy List
                                    </p>

                                </td>
                            </tr>
                        </table>

                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

export default resetPasswordTemplate;
