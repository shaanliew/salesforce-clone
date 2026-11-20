export type FormState = {
  error: string | null
  values: Record<string, string> | null
}

export const initialFormState: FormState = { error: null, values: null }

export type ActionResult = { error: string | null }

export type AuthState = { error: string | null; message: string | null; email: string }
