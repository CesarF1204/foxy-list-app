import { z } from "zod";

export const registerUserSchema = z.object({
  email: z
    .email("Invalid email.")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please input a valid email format."),
  password: z
    .string("Please input your password.")
    .min(8, "Password must be at least 8 characters.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*?["!#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~"])[A-Za-z\d"!#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~"]{8,}$/,
      {
        error:
          "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character.",
      }
    ),
  firstName: z
    .string("Please input your first name.")
    .min(2)
    .regex(/^[A-Za-z]+$/, { error: "First name must only contain letters." }),
  lastName: z
    .string("Please input your last name.")
    .min(2)
    .regex(/^[A-Za-z]+$/, { error: "Last name must only contain letters." }),
});
