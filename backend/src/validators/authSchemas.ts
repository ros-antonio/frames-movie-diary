import { z } from 'zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(NAME_REGEX, {
        message: "Name can only contain letters, spaces, hyphens, and apostrophes",
      }),
    email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, {
      message: 'Please enter a valid email address',
    }),
    password: z
      .string()
      .min(6)
      .max(128)
      .refine((value) => /[a-zA-Z]/.test(value), {
        message: 'Password must contain at least one letter',
      })
      .refine((value) => /[0-9]/.test(value), {
        message: 'Password must contain at least one number',
      }),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(255).regex(EMAIL_REGEX, {
    message: 'Please enter a valid email address',
  }),
  password: z.string().min(6),
});

