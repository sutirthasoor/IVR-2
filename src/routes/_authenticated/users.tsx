import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { app } from '@/lib/firebase';

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

function UsersPage() {
  useStoreVersion();
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [open, setOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadUsers = async () => {
      setLoading(true);
      try {
        let allUsers = await store.listUsers();
        
        // Filter users based on role
        if (user.role === "super_admin") {
          // Super admin sees everyone
          allUsers = allUsers;
        } else if (user.role === "admin") {
          // Admin sees only managers and agents under them, plus themselves
          allUsers = allUsers.filter(u => 
            u.id === user.id || 
            u.adminId === user.id ||
            (u.role === 'agent' && u.adminId === user.id)
          );
        } else if (user.role === "manager") {
          // Manager sees only agents under them
          allUsers = allUsers.filter(u => 
            u.id === user.id || 
            (u.role === 'agent' && u.managerId === user.id)
          );
        }
        
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
  }, [user]);

  const filtered = useMemo(() => {
    let arr = users;
    return arr.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase());
      const matchRole = roleF === "all" || u.role === roleF;
      const matchStatus = statusF === "all" || u.status === statusF;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, q, roleF, statusF]);

  // Authorization check
  if (!user) return null;
  
  // Only super_admin, admin, and manager can access this page
  if (user.role !== "super_admin" && user.role !== "admin" && user.role !== "manager") {
    return <p className="text-sm text-muted-foreground">Not authorized.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  const handleResetPassword = async (userToReset: AppUser) => {
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, userToReset.email);
      toast.success(`Password reset email sent to ${userToReset.email}`);
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(error?.message || 'Failed to send reset email');
    }
    setResetPasswordUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "super_admin" 
              ? "Create and manage all users." 
              : user.role === "admin" 
                ? "Create and manage managers and agents under you."
                : "Create and manage agents under you."}
          </p>
        </div>
        {(user.role === "super_admin" || user.role === "admin" || user.role === "manager") && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add user
          </Button>
        )}
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
                {user.role === "super_admin" && (
                  <SelectItem value="super_admin">Super admin</SelectItem>
                )}
                {user.role !== "manager" && (
                  <SelectItem value="admin">Admin</SelectItem>
                )}
                {(user.role === "super_admin" || user.role === "admin") && (
                  <SelectItem value="manager">Manager</SelectItem>
                )}
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
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "active" ? "default" : "secondary"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.createdAt ? format(u.createdAt, "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>
                    {u.lastLogin ? format(u.lastLogin, "MMM d, p") : "Never"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
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
                        onClick={() => setResetPasswordUser(u)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (confirm(`Delete ${u.fullName}?`)) {
                            await store.deleteUser(u.id);
                            setUsers(prev => prev.filter(user => user.id !== u.id));
                            toast.success("Deleted");
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
        onSave={() => {
          store.listUsers().then(setUsers);
        }}
      />

      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p>Send password reset email to {resetPasswordUser?.email}?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => resetPasswordUser && handleResetPassword(resetPasswordUser)}>
              Send Reset Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserModal({
  open,
  onOpenChange,
  editing,
  creator,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppUser | null;
  creator: AppUser;
  onSave: () => void;
}) {
  const [fullName, setFullName] = useState(editing?.fullName || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [phone, setPhone] = useState(editing?.phone || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(editing?.role || "agent");
  const [adminId, setAdminId] = useState(editing?.adminId || "");
  const [managerId, setManagerId] = useState(editing?.managerId || "");
  const [welcome, setWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<AppUser[]>([]);
  const [managers, setManagers] = useState<AppUser[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      const allUsers = await store.listUsers();
      // Show only admins that this creator can see
      let availableAdmins = allUsers.filter((u) => u.role === "admin");
      if (creator.role === "admin") {
        availableAdmins = availableAdmins.filter(a => a.adminId === creator.id || a.id === creator.id);
      }
      setAdmins(availableAdmins);
      
      // Show only managers that this creator can see
      let availableManagers = allUsers.filter((u) => u.role === "manager");
      if (creator.role === "admin") {
        availableManagers = availableManagers.filter(m => m.adminId === creator.id);
      } else if (creator.role === "manager") {
        availableManagers = availableManagers.filter(m => m.id === creator.id);
      }
      setManagers(availableManagers);
    };
    if (open) {
      loadUsers();
      // Reset password field when opening modal
      if (!editing) {
        setPassword("");
      }
    }
  }, [open, creator, editing]);

  const getAvailableRoles = () => {
    const roles: { value: Role; label: string }[] = [];
    
    if (creator.role === "super_admin") {
      roles.push({ value: "super_admin", label: "Super Admin" });
      roles.push({ value: "admin", label: "Admin" });
      roles.push({ value: "manager", label: "Manager" });
      roles.push({ value: "agent", label: "Agent" });
    } else if (creator.role === "admin") {
      roles.push({ value: "manager", label: "Manager" });
      roles.push({ value: "agent", label: "Agent" });
    } else if (creator.role === "manager") {
      roles.push({ value: "agent", label: "Agent" });
    }
    
    return roles;
  };

  const handleSubmit = async () => {
    if (!fullName || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editing && !password) {
      toast.error("Please enter a password for the new user");
      return;
    }

    setLoading(true);
    
    try {
      const auth = getAuth(app);
      let userId = editing?.id || "";
      
      if (!editing) {
        // Create user in Firebase Authentication
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        userId = userCred.user.uid;
      }
      
      // Determine adminId and managerId based on hierarchy
      let finalAdminId = null;
      let finalManagerId = null;
      
      if (role === "admin") {
        finalAdminId = creator.role === "super_admin" ? null : creator.id;
      } else if (role === "manager") {
        finalAdminId = adminId || (creator.role === "admin" ? creator.id : null);
      } else if (role === "agent") {
        finalManagerId = managerId || (creator.role === "manager" ? creator.id : null);
        // Find the admin through the manager
        if (finalManagerId) {
          const manager = await store.getUser(finalManagerId);
          finalAdminId = manager?.adminId || null;
        } else if (creator.role === "admin") {
          finalAdminId = creator.id;
        }
      }
      
      const u: AppUser = {
        id: userId,
        fullName,
        email,
        phone,
        role,
        status: editing?.status || "active",
        adminId: finalAdminId,
        managerId: finalManagerId,
        createdBy: editing?.createdBy || creator.id,
        createdAt: editing?.createdAt || Date.now(),
      };
      
      await store.upsertUser(u);
      
      if (!editing && welcome) {
        toast.success(`User created successfully! They can login with the password you set.`);
      } else {
        toast.success(editing ? "User updated" : "User created");
      }
      
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please use a different email.');
      } else {
        toast.error(error?.message || 'Failed to save user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name *</Label>
            <Input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="user@company.com"
              disabled={!!editing}
            />
            {editing && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>}
          </div>
          {!editing && (
            <div>
              <Label>Password *</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter a secure password"
              />
              <p className="text-xs text-muted-foreground mt-1">User will use this password to login</p>
            </div>
          )}
          <div>
            <Label>Phone</Label>
            <Input 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <Label>Role *</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableRoles().map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "manager" && creator.role === "super_admin" && (
            <div>
              <Label>Assign to admin (optional)</Label>
              <Select value={adminId} onValueChange={setAdminId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "agent" && (creator.role === "admin" || creator.role === "super_admin") && (
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : (editing ? "Update" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}