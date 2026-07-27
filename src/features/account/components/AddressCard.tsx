"use client";

import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteAddress } from "../actions";

type Address = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  street: string;
  apartment: string | null;
  city: string;
  postalCode: string;
  phone: string | null;
  isDefault: boolean;
};

type Props = { address: Address; onEdit: (address: Address) => void };

export function AddressCard({ address, onEdit }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { execute, isPending } = useAction(deleteAddress, {
    onSuccess: () => setConfirmingDelete(false),
  });

  return (
    <div className="rounded-lg border border-border p-4 text-sm">
      {address.isDefault && (
        <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Domyślny
        </span>
      )}
      <p className="font-medium">
        {address.firstName} {address.lastName}
      </p>
      {address.company && <p className="text-muted-foreground">{address.company}</p>}
      <p className="text-muted-foreground">
        {address.street}
        {address.apartment ? ` / ${address.apartment}` : ""}
      </p>
      <p className="text-muted-foreground">
        {address.postalCode} {address.city}
      </p>
      {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => onEdit(address)}
          className="text-xs font-medium text-primary hover:underline"
        >
          Edytuj
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
        >
          Usuń
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Usuń adres"
        description="Czy na pewno chcesz usunąć ten adres? Tej operacji nie można cofnąć."
        pending={isPending}
        onConfirm={() => execute({ addressId: address.id })}
      />
    </div>
  );
}
