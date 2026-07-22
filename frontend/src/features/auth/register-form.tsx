"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/components/providers/auth-provider";
import { getErrorMessage } from "@/lib/api/errors";
import { tr } from "@/lib/i18n/tr";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  first_name: z.string().min(1, "Ad gerekli"),
  last_name: z.string().min(1, "Soyad gerekli"),
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Parola en az 8 karakter olmalı"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerUser(values);
      toast.success(tr.auth.accountCreated);
      router.replace("/organizations");
    } catch (error) {
      toast.error(getErrorMessage(error, tr.auth.registerFailed));
    }
  });

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{tr.auth.registerTitle}</CardTitle>
        <CardDescription>{tr.auth.registerDescription}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">{tr.auth.firstName}</Label>
              <Input id="first_name" autoComplete="given-name" {...register("first_name")} />
              {errors.first_name ? (
                <p className="text-sm text-destructive">{errors.first_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{tr.auth.lastName}</Label>
              <Input id="last_name" autoComplete="family-name" {...register("last_name")} />
              {errors.last_name ? (
                <p className="text-sm text-destructive">{errors.last_name.message}</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{tr.auth.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="siz@sirket.com"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{tr.auth.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? tr.auth.creatingAccount : tr.auth.createAccount}
          </Button>
          <p className="text-sm text-muted-foreground">
            {tr.auth.alreadyRegistered}{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              {tr.auth.signIn}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
