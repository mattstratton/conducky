import React from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export interface UserRegistrationFormProps {
  onSubmit: (data: { name: string; email: string; password: string }) => void;
  buttonText?: string;
  loading?: boolean;
  error?: string;
  success?: string;
  defaultName?: string;
  defaultEmail?: string;
}

const registrationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required"),
  password2: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.password2, {
  message: "Passwords do not match.",
  path: ["password2"],
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({
  onSubmit,
  buttonText = "Register",
  loading = false,
  error = "",
  success = "",
  defaultName = "",
  defaultEmail = "",
}) => {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onSubmit",
    defaultValues: {
      name: defaultName,
      email: defaultEmail,
      password: "",
      password2: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => onSubmit({ name: data.name, email: data.email, password: data.password }))} className="flex flex-col gap-2">
        <FormField
          name="name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="registration-name">Name</FormLabel>
              <FormControl>
                <input
                  id="registration-name"
                  type="text"
                  placeholder="Name"
                  required
                  {...field}
                  className="border px-2 py-1 rounded"
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="registration-email">Email</FormLabel>
              <FormControl>
                <input
                  id="registration-email"
                  type="email"
                  placeholder="Email"
                  required
                  {...field}
                  className="border px-2 py-1 rounded"
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="registration-password">Password</FormLabel>
              <FormControl>
                <input
                  id="registration-password"
                  type="password"
                  placeholder="Password"
                  required
                  {...field}
                  className="border px-2 py-1 rounded"
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          name="password2"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="registration-password2">Confirm Password</FormLabel>
              <FormControl>
                <input
                  id="registration-password2"
                  type="password"
                  placeholder="Confirm Password"
                  required
                  {...field}
                  className="border px-2 py-1 rounded"
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <div className="text-red-600 mt-2">{error}</div>}
        {success && <div className="text-green-700 font-semibold mt-2">{success}</div>}
        <Button
          type="submit"
          disabled={
            loading ||
            !form.watch("name") ||
            !form.watch("email") ||
            !form.watch("password") ||
            !form.watch("password2")
          }
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-2 disabled:opacity-50"
        >
          {loading ? "Registering..." : buttonText}
        </Button>
      </form>
    </Form>
  );
}; 