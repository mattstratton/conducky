import React, { useState, FormEvent } from "react";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface UserRegistrationFormProps {
  onSubmit: (data: { name: string; email: string; password: string }) => void;
  buttonText?: string;
  loading?: boolean;
  error?: string;
  success?: string;
  defaultName?: string;
  defaultEmail?: string;
}

export const UserRegistrationForm: React.FC<UserRegistrationFormProps> = ({
  onSubmit,
  buttonText = "Register",
  loading = false,
  error = "",
  success = "",
  defaultName = "",
  defaultEmail = "",
}) => {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const emailValid = validateEmail(email);
  const passwordsMatch = password === password2;
  const canSubmit =
    !!name && emailValid && !!password && !!password2 && passwordsMatch && !loading;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name, email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border px-2 py-1 rounded"
        required
        onBlur={() => setTouched(t => ({ ...t, name: true }))}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border px-2 py-1 rounded"
        required
        onBlur={() => setTouched(t => ({ ...t, email: true }))}
      />
      {touched.email && email && !emailValid && (
        <div className="text-red-600 text-sm">Please enter a valid email address.</div>
      )}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border px-2 py-1 rounded"
        required
        onBlur={() => setTouched(t => ({ ...t, password: true }))}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={password2}
        onChange={e => setPassword2(e.target.value)}
        className="border px-2 py-1 rounded"
        required
        onBlur={() => setTouched(t => ({ ...t, password2: true }))}
      />
      {touched.password2 && !passwordsMatch && (
        <div className="text-red-600 text-sm">Passwords do not match.</div>
      )}
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {success && <div className="text-green-700 font-semibold mt-2">{success}</div>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mt-2 disabled:opacity-50"
      >
        {loading ? "Registering..." : buttonText}
      </button>
    </form>
  );
}; 