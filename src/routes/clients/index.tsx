import { ClientOnly, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  Edit2,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { createClient, deleteClient, listClients, updateClient } from "@/db/clients";
import type { Client } from "@/types/client";

export const Route = createFileRoute("/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — Local Ledger" },
      { name: "description", content: "Manage your clients, contact details, and billing addresses." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <ClientOnly fallback={<ClientsSkeleton />}>
        <ClientsContent />
      </ClientOnly>
    </div>
  );
}

function ClientsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded-md bg-muted/60 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="h-10 w-full max-w-sm rounded-md bg-muted/40 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 shadow-paper space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-3 w-44 rounded bg-muted/60 animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsContent() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Client Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  // Edit Client Modal State
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updatingClient, setUpdatingClient] = useState(false);

  // Delete Client Confirmation State
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = async () => {
    const list = await listClients();
    setClients(list);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Filtered Clients by Search Query
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase().trim();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)),
    );
  }, [clients, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Please enter a client name.");
      return;
    }

    setSavingClient(true);
    try {
      const client = await createClient({
        name: createName.trim(),
        email: createEmail.trim(),
        address: createAddress.trim(),
        phone: createPhone.trim(),
      });
      toast.success(`Client "${client.name}" added successfully!`);
      setCreateName("");
      setCreateEmail("");
      setCreateAddress("");
      setCreatePhone("");
      setCreateOpen(false);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create client.");
    } finally {
      setSavingClient(false);
    }
  };

  const openEditModal = (client: Client) => {
    setEditClient(client);
    setEditName(client.name);
    setEditEmail(client.email || "");
    setEditPhone(client.phone || "");
    setEditAddress(client.address || "");
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;
    if (!editName.trim()) {
      toast.error("Client name cannot be empty.");
      return;
    }

    setUpdatingClient(true);
    try {
      await updateClient(editClient.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
      });
      toast.success(`Client "${editName.trim()}" updated successfully!`);
      setEditClient(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update client.");
    } finally {
      setUpdatingClient(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      await deleteClient(clientToDelete.id);
      toast.success(`Client "${clientToDelete.name}" removed.`);
      setClientToDelete(null);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete client.");
    } finally {
      setDeleting(false);
    }
  };

  if (clients === null) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client contacts, billing addresses, and invoice profiles.
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 shadow-sm text-xs font-semibold cursor-pointer shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </Button>
      </header>

      {/* Toolbar: Search and Counter */}
      {clients.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name, email, or address…"
              className="pl-9 pr-8 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <span>
              Showing {filteredClients.length} of {clients.length} client
              {clients.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Add your clients once and quickly attach them to new offline invoices."
          icon={<Users className="h-6 w-6" />}
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5 shadow-sm font-medium">
              <UserPlus className="h-4 w-4" />
              Add your first client
            </Button>
          }
        />
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="font-display text-base font-semibold text-foreground">No matching clients</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            No client contacts match &ldquo;{searchQuery}&rdquo;.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
            Clear search filter
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredClients.map((client) => {
            const initials = client.name
              .split(" ")
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "CL";

            return (
              <div
                key={client.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-paper transition-shadow hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-display font-bold text-sm">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold tracking-tight text-foreground truncate">
                          {client.name}
                        </h3>
                        {client.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No email</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Phone & Address Details */}
                  <div className="space-y-1.5 pt-1 text-xs text-muted-foreground border-t border-border/50">
                    {client.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-start gap-1.5 pt-0.5">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground mt-0.5" />
                        <span className="whitespace-pre-line leading-relaxed truncate-2">
                          {client.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary px-2 gap-1 cursor-pointer"
                  >
                    <Link to="/invoices/new">
                      <FileText className="h-3 w-3" />
                      Create Invoice
                    </Link>
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => openEditModal(client)}
                      title="Edit Client"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      onClick={() => setClientToDelete(client)}
                      title="Delete Client"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Client Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <UserPlus className="h-5 w-5" />
                <DialogTitle className="font-display text-xl">Add New Client</DialogTitle>
              </div>
              <DialogDescription>
                Store client contact details locally for instant invoice generation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-client-name">
                  Client Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-client-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-client-email">Email Address</Label>
                <Input
                  id="new-client-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="billing@acmecorp.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-client-phone">Phone Number</Label>
                <Input
                  id="new-client-phone"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-client-address">Billing Address</Label>
                <Textarea
                  id="new-client-address"
                  rows={2}
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="456 Corporate Ave, Suite 100, New York, NY"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={savingClient}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingClient || !createName.trim()} className="gap-1.5">
                {savingClient ? "Saving…" : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={editClient !== null} onOpenChange={(open) => !open && setEditClient(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateSubmit}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Edit2 className="h-5 w-5" />
                <DialogTitle className="font-display text-xl">Edit Client</DialogTitle>
              </div>
              <DialogDescription>Update client contact details and address.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-client-name">
                  Client Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-client-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-email">Email Address</Label>
                <Input
                  id="edit-client-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-phone">Phone Number</Label>
                <Input
                  id="edit-client-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-client-address">Billing Address</Label>
                <Textarea
                  id="edit-client-address"
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditClient(null)}
                disabled={updatingClient}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatingClient || !editName.trim()} className="gap-1.5">
                {updatingClient ? "Updating…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Dialog (Destructive Action) */}
      <AlertDialog
        open={clientToDelete !== null}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle className="font-display text-lg">Delete Client?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 pt-1 text-left">
              <p className="text-sm text-foreground">
                Are you sure you want to delete client{" "}
                <strong className="font-semibold text-foreground">
                  &ldquo;{clientToDelete?.name}&rdquo;
                </strong>
                ?
              </p>
              <p className="text-xs text-muted-foreground">
                Existing invoices associated with this client will remain preserved in your database,
                but this client profile will be removed from your contact list.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
