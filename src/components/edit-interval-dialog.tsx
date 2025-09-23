"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Website } from "@/types";

const formSchema = z.object({
  interval: z.coerce.number().min(30),
});

interface EditIntervalDialogProps {
  website: Website | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateInterval: (websiteId: string, interval: number) => void;
}

export function EditIntervalDialog({
  website,
  isOpen,
  onOpenChange,
  onUpdateInterval,
}: EditIntervalDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: {
      interval: website?.interval || 60,
    },
  });

  if (!website) return null;

  function onSubmit(values: z.infer<typeof formSchema>) {
    onUpdateInterval(website!.id, values.interval);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Interval</DialogTitle>
          <DialogDescription className="break-all">
            Set a new check interval for {website.url}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check Interval</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an interval" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                      <SelectItem value="900">15 minutes</SelectItem>
                      <SelectItem value="1800">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}