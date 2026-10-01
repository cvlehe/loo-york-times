"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { manageAdmin, type AdminPermissionState } from "@/app/admin/permissions-actions";

const initialState: AdminPermissionState = { message: "", status: "idle" };

type AdminPermissionsPanelProps = {
  admins: {
    email: string;
    grantedAt: string;
    id: string;
  }[];
  currentAdminId: string;
};

function AddButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Adding…" : "Add administrator"}</button>;
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Removing…" : "Remove"}</button>;
}

export function AdminPermissionsPanel({ admins, currentAdminId }: AdminPermissionsPanelProps) {
  const [state, formAction] = useActionState(manageAdmin, initialState);
  const addFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") addFormRef.current?.reset();
  }, [state.status]);

  return (
    <section className="admin-permissions-section" id="permissions" aria-labelledby="permissions-heading">
      <div className="section-heading-row admin-section-heading">
        <div>
          <p className="kicker">Access control</p>
          <h2 id="permissions-heading">Administrator permissions</h2>
        </div>
        <p className="edition-note">Only existing accounts can be granted access</p>
      </div>

      <div className="admin-permissions-panel">
        <form action={formAction} className="admin-permissions-add" ref={addFormRef}>
          <input name="operation" type="hidden" value="grant" />
          <label htmlFor="admin-email">Email address</label>
          <div className="admin-permissions-add-controls">
            <input autoComplete="email" id="admin-email" maxLength={320} name="email" placeholder="editor@example.com" required type="email" />
            <AddButton />
          </div>
          <p>They must sign in once before their email address can be added.</p>
        </form>

        {state.message ? (
          <p className={`form-message ${state.status === "error" ? "form-message-error" : "form-message-success"}`} aria-live="polite" role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </p>
        ) : null}

        <ul className="admin-permissions-list" aria-label="Current administrators">
          {admins.map((admin) => (
            <li key={admin.id}>
              <div>
                <strong>{admin.email}</strong>
                {admin.id === currentAdminId ? <span className="admin-you-label">You</span> : null}
                <p>Granted {new Date(admin.grantedAt).toLocaleDateString()}</p>
              </div>
              {admin.id !== currentAdminId ? (
                <form action={formAction}>
                  <input name="operation" type="hidden" value="revoke" />
                  <input name="email" type="hidden" value={admin.email} />
                  <RemoveButton />
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
