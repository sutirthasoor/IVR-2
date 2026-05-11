import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { store, useStoreVersion, newId } from "@/lib/mock-store";
import type { AppUser, Role } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [open, setOpen] = useState(false);

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return <p className="text-sm text-muted-foreground">Not authorized.</p>;
  }

  const all = useMemo(() => {
    let arr = store.listUsers();
    if (user.role === "admin") {
      arr = arr.filter((u) => u.id === user.id || u.adminId === user.id);
    }
    return arr.filter((u) => {
      const m =
        !q ||
        u.fullName.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase());
      const mr = roleF === "all" || u.role === roleF;
      const ms = statusF === "all" || u.status === statusF;
      return m && mr && ms;
    });
  }, [q, roleF, statusF, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage admins, managers and agents.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />
            <Select value={roleF} onValueChange={setRoleF}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_break">On break</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>{u.status}</TableCell>
                  <TableCell>{u.createdAt ? format(u.createdAt, "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    {u.lastLogin ? format(u.lastLogin, "MMM d, p") : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(u);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete ${u.fullName}?`)) {
                          store.deleteUser(u.id);
                          toast.success("Deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserModal
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        creator={user}
      />
    </div>
  );
}

function UserModal({
  open,
  onOpenChange,
  editing,
  creator,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppUser | null;
  creator: AppUser;
}) {
  const [fullName, setFullName] = useState(editing?.fullName || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [phone, setPhone] = useState(editing?.phone || "");
  const [role, setRole] = useState<Role>(editing?.role || "agent");
  const [adminId, setAdminId] = useState(editing?.adminId || "");
  const [managerId, setManagerId] = useState(editing?.managerId || "");
  const [welcome, setWelcome] = useState(true);

  const admins = store.listUsers().filter((u) => u.role === "admin");
  const managers = store.listUsers().filter((u) => u.role === "manager");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creator.role === "super_admin" && (
                  <>
                    <SelectItem value="super_admin">Super admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </>
                )}
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "manager" && (
            <div>
              <Label>Assign to admin</Label>
              <Select value={adminId} onValueChange={setAdminId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose admin" />
                </SelectTrigger>
                <SelectContent>
                  {admins.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "agent" && (
            <div>
              <Label>Assign to manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!editing && (
            <div className="flex items-center justify-between">
              <Label>Send welcome email</Label>
              <Switch checked={welcome} onCheckedChange={setWelcome} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const u: AppUser = {
                id: editing?.id || newId("u"),
                fullName,
                email,
                phone,
                role,
                status: editing?.status || "active",
                adminId: role === "manager" ? adminId : role === "agent" ? store.getUser(managerId)?.adminId || null : null,
                managerId: role === "agent" ? managerId : null,
                createdBy: editing?.createdBy || creator.id,
                createdAt: editing?.createdAt || Date.now(),
              };
              store.upsertUser(u);
              toast.success(editing ? "Updated" : "Created");
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
