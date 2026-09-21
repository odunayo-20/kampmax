"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, UserRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";
import { getCampuses } from "@/services/campus";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { KAMPMAX_ROLE_PATHS, type KampmaxRoleId } from "@/components/layout/footer/role-paths";

interface RoleChoice {
  id: KampmaxRoleId;
  /** Role actually issued by the backend auth contract. */
  role: UserRole;
  /** Where to send the member right after account creation. */
  next: string | null;
  cta: string;
}

const ROLE_CHOICES: RoleChoice[] = [
  { id: "customer", role: "student", next: null, cta: "Continue as Customer" },
  { id: "vendor", role: "vendor", next: null, cta: "Become a Vendor" },
  { id: "freelancer", role: "student", next: "/onboarding/freelancer", cta: "Become a Freelancer" },
  { id: "service_provider", role: "student", next: "/onboarding/service-provider", cta: "Become a Service Provider" },
  { id: "employer", role: "student", next: "/onboarding/employer", cta: "Hire Talent" },
];

function choiceById(id: KampmaxRoleId): RoleChoice {
  return ROLE_CHOICES.find((c) => c.id === id) ?? ROLE_CHOICES[0];
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCampus = searchParams.get("campus") || "";
  const { register } = useAuth();
  const campuses = getCampuses();

  const [step, setStep] = useState<"role" | "form">(
    preselectedCampus ? "form" : "role"
  );
  const [choiceId, setChoiceId] = useState<KampmaxRoleId>("customer");
  const choice = choiceById(choiceId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [campusId, setCampusId] = useState(preselectedCampus);
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedCampus = campuses.find((c) => c.id === campusId);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Full name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(\+?234|0)[789][01]\d{8}$/.test(phone.replace(/\s/g, ""))) {
      newErrors.phone = "Enter a valid Nigerian phone number";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!campusId) newErrors.campusId = "Please select your campus";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /** Choose a pathway: profile roles create the base account first, then
   *  continue into the matching profile onboarding (one account, profiles). */
  function choose(id: KampmaxRoleId) {
    setChoiceId(id);
    setStep("form");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await register({
        email: email.trim().toLowerCase(),
        username: name.trim(),
        firstName: name.trim(),
        lastName: "",
        password,
        phone: phone.trim(),
      });
      if (result.success) {
        router.push(choice.next ?? "/home");
      } else {
        setErrors({ general: result.message ?? "Registration failed." });
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Role/pathway selection
  if (step === "role") {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-kampmax-text">
            Create your Kampmax account
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-1">
            Choose how you plan to use Kampmax. You can explore other
            opportunities after creating your account.
          </p>
        </div>

        <div className="space-y-3">
          {ROLE_CHOICES.map((c) => {
            const path = KAMPMAX_ROLE_PATHS[c.id];
            const Icon = path.icon;
            return (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                  "border-kampmax-border hover:border-kampmax-blue/50 bg-white"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-kampmax-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-kampmax-blue" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-kampmax-text">
                    {path.title}
                  </h3>
                  <p className="text-xs text-kampmax-text-secondary mt-0.5">
                    {path.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-kampmax-blue shrink-0">
                  {c.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-kampmax-border bg-kampmax-muted/30 p-3.5">
          <p className="text-xs leading-relaxed text-kampmax-text-secondary">
            <span className="font-semibold text-kampmax-text">
              One account, many roles.
            </span>{" "}
            Your Kampmax account is the starting point — after signing in you
            can also activate a freelancer, service provider or employer
            profile on the same account.
          </p>
        </div>

        <p className="text-center text-sm text-kampmax-text-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Step 2: Registration form
  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => setStep("role")}
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-kampmax-text">
          Create your account{choice.next ? ` as a ${KAMPMAX_ROLE_PATHS[choiceId].title}` : ""}
        </h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          {choice.next
            ? "We'll create your Kampmax account first, then start your onboarding in a moment."
            : "Fill in your details to start using Kampmax."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
            <p className="text-sm text-kampmax-error">{errors.general}</p>
          </div>
        )}

        <Input
          label="Full name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          leftIcon={<UserRound className="h-4 w-4" />}
          autoComplete="name"
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@school.edu.ng"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />

        <Input
          label="Phone number"
          type="tel"
          placeholder="+234 812 345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          leftIcon={<Phone className="h-4 w-4" />}
          autoComplete="tel"
        />

        <Select
          label="Campus"
          value={campusId}
          onChange={(e) => setCampusId(e.target.value)}
          error={errors.campusId}
          placeholder="Select your campus"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.location}
            </option>
          ))}
        </Select>

        {selectedCampus && (
          <div className="space-y-4">
            <Select
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Select your department (optional)"
            >
              {selectedCampus.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>

            <Select
              label="Level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Select your level (optional)"
            >
              <option value="ND1">ND1</option>
              <option value="ND2">ND2</option>
              <option value="HND1">HND1</option>
              <option value="HND2">HND2</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
            </Select>
          </div>
        )}

        <PasswordInput
          label="Password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-kampmax-text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}