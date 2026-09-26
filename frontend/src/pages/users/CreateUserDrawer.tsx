import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useCreateUser } from "../../hooks/useUsers";
import { ApiError } from "../../lib/api";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["parent", "therapist", "admin"]),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateUserDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: "parent" } });

  useEffect(() => {
    if (open) reset({ role: "parent", full_name: "", email: "", password: "", phone: "" });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createUser.mutateAsync({ ...values, phone: values.phone || null });
      toast.success("Account created", { description: `${values.full_name} can now sign in.` });
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      toast.error("Couldn't create account", { description: message });
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="New account" subtitle="Create a parent, therapist, or admin account directly.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Full name" placeholder="Jamie Rivera" error={errors.full_name?.message} {...register("full_name")} />
        <Input label="Email" type="email" placeholder="jamie@example.com" error={errors.email?.message} {...register("email")} />
        <Input
          label="Temporary password"
          type="password"
          placeholder="At least 8 characters"
          hint="Share this with the person so they can sign in and change it."
          error={errors.password?.message}
          {...register("password")}
        />
        <Select label="Role" error={errors.role?.message} {...register("role")}>
          <option value="parent">Parent</option>
          <option value="therapist">Therapist</option>
          <option value="admin">Admin</option>
        </Select>
        <Input label="Phone (optional)" type="tel" placeholder="+61 4xx xxx xxx" {...register("phone")} />

        <div className="mt-2 flex gap-3">
          <Button type="submit" loading={createUser.isPending} className="flex-1">
            Create account
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
