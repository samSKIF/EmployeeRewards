import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, Users, Building, MapPin, Crown, UserCheck, 
  Plus, Trash2, Save, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: number;
  name: string;
  surname: string;
  email: string;
  department: string;
  location: string;
  jobTitle: string;
  isAdmin: boolean;
  adminScope: string;
  allowedSites: string[];
  allowedDepartments: string[];
  avatarUrl?: string;
}

export default function EmployeePromotion() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [promotingEmployee, setPromotingEmployee] = useState<Employee | null>(null);
  const [allSites, setAllSites] = useState<string[]>([]);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [newSite, setNewSite] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
    fetchSitesAndDepartments();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [employees, searchTerm]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/admin/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSitesAndDepartments = async () => {
    try {
      const [sitesResponse, deptResponse] = await Promise.all([
        fetch('/api/users/locations'),
        fetch('/api/users/departments')
      ]);

      if (sitesResponse.ok) {
        const sites = await sitesResponse.json();
        setAllSites(sites);
      }

      if (deptResponse.ok) {
        const departments = await deptResponse.json();
        setAllDepartments(departments);
      }
    } catch (error) {
      console.error('Failed to fetch sites and departments:', error);
    }
  };

  const promoteToAdmin = (employee: Employee) => {
    setPromotingEmployee({
      ...employee,
      adminScope: 'none',
      allowedSites: [],
      allowedDepartments: []
    });
  };

  const savePromotion = async () => {
    if (!promotingEmployee) return;

    try {
      const response = await fetch(`/api/admin/permissions/${promotingEmployee.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminScope: promotingEmployee.adminScope,
          allowedSites: promotingEmployee.allowedSites,
          allowedDepartments: promotingEmployee.allowedDepartments
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `${promotingEmployee.name} has been promoted to admin`,
        });
        
        await fetchEmployees();
        setPromotingEmployee(null);
      } else {
        throw new Error('Failed to promote employee');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to promote employee",
        variant: "destructive",
      });
    }
  };

  const addSite = () => {
    if (newSite.trim() && promotingEmployee && !promotingEmployee.allowedSites.includes(newSite.trim())) {
      setPromotingEmployee({
        ...promotingEmployee,
        allowedSites: [...promotingEmployee.allowedSites, newSite.trim()]
      });
      setNewSite('');
    }
  };

  const removeSite = (siteToRemove: string) => {
    if (promotingEmployee) {
      setPromotingEmployee({
        ...promotingEmployee,
        allowedSites: promotingEmployee.allowedSites.filter(site => site !== siteToRemove)
      });
    }
  };

  const addDepartment = () => {
    if (newDepartment.trim() && promotingEmployee && !promotingEmployee.allowedDepartments.includes(newDepartment.trim())) {
      setPromotingEmployee({
        ...promotingEmployee,
        allowedDepartments: [...promotingEmployee.allowedDepartments, newDepartment.trim()]
      });
      setNewDepartment('');
    }
  };

  const removeDepartment = (deptToRemove: string) => {
    if (promotingEmployee) {
      setPromotingEmployee({
        ...promotingEmployee,
        allowedDepartments: promotingEmployee.allowedDepartments.filter(dept => dept !== deptToRemove)
      });
    }
  };

  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'super': return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'site': return <Building className="h-5 w-5 text-blue-600" />;
      case 'department': return <Users className="h-5 w-5 text-green-600" />;
      case 'hybrid': return <MapPin className="h-5 w-5 text-purple-600" />;
      default: return <UserCheck className="h-5 w-5 text-gray-500" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'super': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'site': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'department': return 'bg-green-100 text-green-800 border-green-300';
      case 'hybrid': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading employees...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Employee Promotion</h1>
          <p className="text-muted-foreground">Promote employees to admin roles with specific permissions</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, email, department, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Grid */}
      <div className="grid gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.avatarUrl} />
                    <AvatarFallback>
                      {employee.name.charAt(0)}{employee.surname?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {employee.isAdmin && getScopeIcon(employee.adminScope)}
                      {employee.name} {employee.surname}
                    </CardTitle>
                    <CardDescription>{employee.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {employee.isAdmin ? (
                    <Badge className={getScopeColor(employee.adminScope)}>
                      {employee.adminScope.toUpperCase()} ADMIN
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => promoteToAdmin(employee)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Promote to Admin
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Job Title</Label>
                  <p className="text-sm text-muted-foreground">{employee.jobTitle || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">{employee.department || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm text-muted-foreground">{employee.location || 'Not specified'}</p>
                </div>
              </div>

              {employee.isAdmin && (
                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium">Managed Sites</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {employee.allowedSites?.map((site) => (
                        <Badge key={site} variant="secondary">
                          <Building className="h-3 w-3 mr-1" />
                          {site}
                        </Badge>
                      ))}
                      {(!employee.allowedSites || employee.allowedSites.length === 0) && (
                        <span className="text-sm text-muted-foreground">All sites</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Managed Departments</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {employee.allowedDepartments?.map((dept) => (
                        <Badge key={dept} variant="secondary">
                          <Users className="h-3 w-3 mr-1" />
                          {dept}
                        </Badge>
                      ))}
                      {(!employee.allowedDepartments || employee.allowedDepartments.length === 0) && (
                        <span className="text-sm text-muted-foreground">All departments</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promotion Modal */}
      {promotingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Promote to Admin - {promotingEmployee.name} {promotingEmployee.surname}</CardTitle>
              <CardDescription>{promotingEmployee.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Admin Scope</Label>
                <Select
                  value={promotingEmployee.adminScope}
                  onValueChange={(value) => setPromotingEmployee({...promotingEmployee, adminScope: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super">Super Admin (Full Company Access)</SelectItem>
                    <SelectItem value="site">Site Admin (Multiple Sites Management)</SelectItem>
                    <SelectItem value="department">Department Admin (Multiple Departments Management)</SelectItem>
                    <SelectItem value="hybrid">Hybrid Admin (Sites + Departments)</SelectItem>
                    <SelectItem value="none">No Admin Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(promotingEmployee.adminScope === 'site' || promotingEmployee.adminScope === 'hybrid') && (
                <div>
                  <Label>Managed Sites (Multiple Selection Allowed)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {promotingEmployee.allowedSites?.map((site) => (
                      <Badge key={site} variant="secondary" className="flex items-center gap-1">
                        {site}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => removeSite(site)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select value={newSite} onValueChange={setNewSite}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select site to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {allSites.filter(site => !promotingEmployee.allowedSites.includes(site)).map((site) => (
                          <SelectItem key={site} value={site}>{site}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addSite} disabled={!newSite}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {(promotingEmployee.adminScope === 'department' || promotingEmployee.adminScope === 'hybrid') && (
                <div>
                  <Label>Managed Departments (Multiple Selection Allowed)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {promotingEmployee.allowedDepartments?.map((dept) => (
                      <Badge key={dept} variant="secondary" className="flex items-center gap-1">
                        {dept}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => removeDepartment(dept)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select value={newDepartment} onValueChange={setNewDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {allDepartments.filter(dept => !promotingEmployee.allowedDepartments.includes(dept)).map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addDepartment} disabled={!newDepartment}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPromotingEmployee(null)}>
                  Cancel
                </Button>
                <Button onClick={savePromotion} disabled={promotingEmployee.adminScope === 'none'}>
                  <Save className="h-4 w-4 mr-2" />
                  Promote to Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}