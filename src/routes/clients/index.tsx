import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { listClients, deleteClient, createClient } from "@/db/clients";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import type { Client } from "@/types/client";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [{ title: "Clients — Local Ledger" }],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Clients</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your client contacts.</p>
        </div>
      </header>

      <ClientOnly fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ClientsContent />
      </ClientOnly>
    </div>
  );
}

function ClientsContent() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const refresh = () => listClients().then(setClients);
  useEffect(() => {
    refresh();
  }, []);

  if (clients === null) {
    return <p className="text-sm text-muted-foreground">Reading local database…</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await createClient({ name, email, address, phone });
    setName("");
    setEmail("");
    setAddress("");
    setPhone("");
    setShowForm(false);
    refresh();
  }

  return (
    <div className="space-y-6">
      {clients.length === 0 && !showForm ? (
        <EmptyState
          title="No clients yet"
          description="Add a client to start creating invoices for them."
          action={
            <Button onClick={() => setShowForm(true)}>Add client</Button>
          }
        />
      ) : (
        <>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>Add client</Button>
          )}

          {showForm && (
            <form
              onSubmit={submit}
              className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-paper"
            >
              <h2 className="font-display text-lg">New client</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-name">Name</Label>
                  <Input
                    id="client-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-address">Address</Label>
                  <Input
                    id="client-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Phone</Label>
                  <Input
                    id="client-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save client</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {clients.length > 0 && (
            <ul className="space-y-3">
              {clients.map((client) => (
                <li
                  key={client.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-paper"
                >
                  <div className="min-w-40 flex-1">
                    <p className="font-display text-lg">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.email || "No email"}
                      {client.phone ? ` · ${client.phone}` : ""}
                    </p>
                    {client.address && (
                      <p className="text-xs text-muted-foreground">{client.address}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await deleteClient(client.id);
                      refresh();
                    }}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
