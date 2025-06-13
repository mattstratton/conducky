import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";

interface TitleEditFormProps {
  initialTitle: string;
  onSave: (title: string) => Promise<void>;
  onCancel: () => void;
}

const titleSchema = z.object({
  title: z.string().min(10, "Title must be between 10 and 70 characters.").max(70, "Title must be between 10 and 70 characters.")
});
type TitleFormValues = z.infer<typeof titleSchema>;

export function TitleEditForm({ initialTitle, onSave, onCancel }: TitleEditFormProps) {
  const [success, setSuccess] = useState("");
  const form = useForm<TitleFormValues>({
    resolver: zodResolver(titleSchema),
    defaultValues: { title: initialTitle },
    mode: "onSubmit",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(async (data) => {
        setSuccess("");
        try {
          await onSave(data.title);
          setSuccess("Title updated!");
          form.reset({ title: data.title });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Failed to update title.";
          form.setError("title", { message: errorMessage });
        }
      })} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <FormField
          name="title"
          control={form.control}
          render={({ field }) => (
            <FormItem className="w-80 max-w-full">
              <FormLabel htmlFor="edit-title">Report Title</FormLabel>
              <FormControl>
                <input
                  id="edit-title"
                  type="text"
                  placeholder="Report Title"
                  autoFocus
                  className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Save</Button>
        <Button type="button" onClick={() => { onCancel(); form.reset({ title: initialTitle }); }} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm">Cancel</Button>
        {success && <div className="text-xs text-green-500 dark:text-green-400 mt-1">{success}</div>}
      </form>
    </Form>
  );
} 