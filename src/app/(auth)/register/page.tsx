"use client";

import { Suspense, useState, FormEvent, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, UserRound, AtSign, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { joinCampus } from "@/services/campus";
import { RegistrationCampusSelector } from "@/components/auth";
import { cn } from "@/lib/utils";
import { Campus, UserRole } from "@/types";
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
  { id: "vendor", role: "vendor", next: "/onboarding/vendor", cta: "Become a Vendor" },
  { id: "freelancer", role: "student", next: "/onboarding/freelancer", cta: "Become a Freelancer" },
  { id: "service_provider", role: "student", next: "/onboarding/service-provider", cta: "Become a Service Provider" },
  { id: "employer", role: "student", next: "/onboarding/employer", cta: "Hire Talent" },
];

function choiceById(id: KampmaxRoleId): RoleChoice {
  return ROLE_CHOICES.find((c) => c.id === id) ?? ROLE_CHOICES[0];
}

/**
 * Validates the password against the backend's RegisterDto policy:
 * 8+ chars, at least one uppercase, one lowercase, one digit, one special char.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/\d/.test(password)) return "Password must include a number";
  if (!/[@$!%*?&#^()_+\-=]/.test(password)) return "Password must include a special character (e.g. !, @, #)";
  return null;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, status: authStatus } = useAuth();
  const { campuses, selectedCampus, setSelectedCampus } = useApp();
  const campusParam = searchParams.get("campus");

  const [step, setStep] = useState<"role" | "form">("role");
  const [choiceId, setChoiceId] = useState<KampmaxRoleId>("customer");
  const choice = choiceById(choiceId);

  // Campus selection state — pre-populated from query param or app state
  const [chosenCampus, setChosenCampus] = useState<Campus | null>(() => {
    if (campusParam && campuses.length > 0) {
      const match = campuses.find(
        (c) =>
          c.id === campusParam ||
          c.abbreviation.toLowerCase() === campusParam.toLowerCase()
      );
      if (match) return match;
    }
    if (selectedCampus && selectedCampus.id) {
      return selectedCampus;
    }
    return null;
  });

  // Sync campus state once campuses load
  useEffect(() => {
    if (!chosenCampus && campuses.length > 0) {
      if (campusParam) {
        const match = campuses.find(
          (c) =>
            c.id === campusParam ||
            c.abbreviation.toLowerCase() === campusParam.toLowerCase()
        );
        if (match) {
          setChosenCampus(match);
          return;
        }
      }
      if (selectedCampus && selectedCampus.id) {
        const match = campuses.find((c) => c.id === selectedCampus.id);
        if (match) {
          setChosenCampus(match);
        }
      }
    }
  }, [campuses, campusParam, selectedCampus, chosenCampus]);

  const handleSelectCampus = useCallback(
    (campus: Campus) => {
      setChosenCampus(campus);
      setSelectedCampus(campus);
      setErrors((prev) => {
        if (!prev.campus) return prev;
        const copy = { ...prev };
        delete copy.campus;
        return copy;
      });
    },
    [setSelectedCampus]
  );

  /** Where a role choice should land once we already have a session for
   * this person — the onboarding route for that capability (customer has
   * none, since they already are one), carrying the campus pick forward. */
  function destinationForExistingAccount(c: RoleChoice): string {
    if (!c.next) return "/home";
    const cid = chosenCampus?.id || campusParam;
    return cid ? `${c.next}?campus=${encodeURIComponent(cid)}` : c.next;
  }

  // Form fields — mapped 1-to-1 with backend RegisterDto
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    // Mandatory campus selection
    if (!chosenCampus || !chosenCampus.id) {
      newErrors.campus = "Please select your campus or institution";
    }

    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (phone.trim()) {
      // Optional — validate format only if provided
      if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ""))) {
        newErrors.phone = "Enter a valid phone number (e.g. +2348012345678)";
      }
    }

    const passwordError = validatePassword(password);
    if (!password) {
      newErrors.password = "Password is required";
    } else if (passwordError) {
      newErrors.password = passwordError;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function choose(id: KampmaxRoleId) {
    const c = choiceById(id);
    if (authStatus === "authenticated") {
      router.push(destinationForExistingAccount(c));
      return;
    }
    setChoiceId(id);
    setStep("form");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;
    if (!chosenCampus) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await register({
        email: email.trim().toLowerCase(),
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password,
        // Only send phone if the user filled it in
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });

      if (result.success) {
        // Sync selected campus across the app
        setSelectedCampus(chosenCampus);

        // Resiliently register campus membership in backend
        try {
          await joinCampus(chosenCampus.id);
        } catch {
          // If offline or mock backend, local selection remains persisted
        }

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

  // Avoid flashing before auth state is loaded
  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
      </div>
    );
  }

  // Step 1: Role/pathway selection
  if (step === "role") {
    const alreadySignedIn = authStatus === "authenticated";
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to intro
          </Link>
          <h1 className="text-2xl font-bold text-kampmax-text">
            {alreadySignedIn ? "You're already signed in" : "Create your Kampmax account"}
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-1">
            {alreadySignedIn
              ? "Pick what you'd like to activate on your existing account — no need to sign up again."
              : "Choose how you plan to use Kampmax. You can explore other opportunities after creating your account."}
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
            {alreadySignedIn
              ? "Whatever you pick is added to your current account — your existing profiles stay exactly as they are."
              : "Your Kampmax account is the starting point — after signing in you can also activate a freelancer, service provider or employer profile on the same account."}
          </p>
        </div>

        {!alreadySignedIn && (
          <p className="text-center text-sm text-kampmax-text-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    );
  }

  // Step 2: Registration form with embedded campus selection
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setStep("role")}
            className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Change role
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-kampmax-blue/10 text-kampmax-blue">
            <Sparkles className="h-3.5 w-3.5" />
            {KAMPMAX_ROLE_PATHS[choiceId].title}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-kampmax-text">
          Create your account
        </h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          {choice.next
            ? "We'll set up your campus account first, then begin your role onboarding."
            : "Fill in your details and select your school to start using Kampmax."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
            <p className="text-sm text-kampmax-error">{errors.general}</p>
          </div>
        )}

        {/* Embedded, Required Campus Selection */}
        <RegistrationCampusSelector
          selectedCampus={chosenCampus}
          onSelectCampus={handleSelectCampus}
          error={errors.campus}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
            leftIcon={<UserRound className="h-4 w-4" />}
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Username"
          type="text"
          placeholder="johndoe"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          leftIcon={<AtSign className="h-4 w-4" />}
          autoComplete="username"
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
          label="Phone number (optional)"
          type="tel"
          placeholder="+2348012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          leftIcon={<Phone className="h-4 w-4" />}
          autoComplete="tel"
        />

        <PasswordInput
          label="Password"
          placeholder="At least 8 characters"
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

        <p className="text-xs text-kampmax-text-secondary">
          Password must be 8+ characters with uppercase, lowercase, a number, and a special character.
        </p>

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