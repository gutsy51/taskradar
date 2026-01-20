import {
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconFileTypeCsv,
  IconMail,
  IconRefresh,
  IconSearch,
  IconSelector,
  IconShield,
  IconUser,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsers } from "@/hooks/use-api";
import type { ListUser } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortField =
  | "name"
  | "email"
  | "role"
  | "status"
  | "last_login"
  | "date_joined";
type SortOrder = "asc" | "desc";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Используем хук для получения данных пользователей
  const {
    data: usersData = [],
    isLoading,
    refetch,
    isFetching,
  } = useUsers(debouncedSearchTerm || undefined);

  // Функция для форматирования даты
  const formatDate = useCallback((date: Date | string | null) => {
    if (!date) return "Никогда";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Функция для получения инициалов пользователя
  const getUserInitials = useCallback((user: ListUser) => {
    return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
  }, []);

  // Функция для получения полного имени
  const getUserFullName = useCallback((user: ListUser) => {
    return `${user.first_name} ${user.last_name}`.trim() || user.email;
  }, []);

  // Функция для сортировки
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortOrder("asc");
      }
    },
    [sortField, sortOrder],
  );

  // Компонент кнопки сортировки
  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortOrder === "asc" ? (
            <IconChevronUp className="h-3 w-3" />
          ) : (
            <IconChevronDown className="h-3 w-3" />
          )
        ) : (
          <IconSelector className="h-3 w-3 opacity-50" />
        )}
      </span>
    </Button>
  );

  // Статистика пользователей
  const stats = useMemo(() => {
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter((u) => u.is_active).length;
    const staffUsers = usersData.filter((u) => u.is_staff).length;
    const inactiveUsers = totalUsers - activeUsers;
    const recentlyLoggedIn = usersData.filter((u) => {
      if (!u.last_login) return false;
      const lastLogin = new Date(u.last_login);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastLogin > thirtyDaysAgo;
    }).length;

    return {
      totalUsers,
      activeUsers,
      staffUsers,
      inactiveUsers,
      recentlyLoggedIn,
    };
  }, [usersData]);

  // Фильтрация и сортировка пользователей
  const filteredAndSortedUsers = useMemo(() => {
    // Сначала фильтруем (используем локальный searchTerm для мгновенного отклика)
    const filtered = usersData.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        selectedRole === "all" ||
        (selectedRole === "staff" && user.is_staff) ||
        (selectedRole === "users" && !user.is_staff);

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && user.is_active) ||
        (selectedStatus === "inactive" && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Затем сортируем
    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = getUserFullName(a).toLowerCase();
          bValue = getUserFullName(b).toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "role":
          aValue = a.is_staff ? 1 : 0;
          bValue = b.is_staff ? 1 : 0;
          break;
        case "status":
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case "last_login":
          aValue = a.last_login ? new Date(a.last_login).getTime() : 0;
          bValue = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        case "date_joined":
          aValue = new Date(a.date_joined).getTime();
          bValue = new Date(b.date_joined).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    usersData,
    searchTerm,
    selectedRole,
    selectedStatus,
    sortField,
    sortOrder,
    getUserFullName,
  ]);

  const handleRefresh = () => {
    refetch();
  };

  // Функция для экспорта в CSV
  const handleExportCSV = useCallback(() => {
    const headers = [
      "ID",
      "Имя",
      "Фамилия",
      "Email",
      "Роль",
      "Статус",
      "Последний вход",
      "Дата регистрации",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredAndSortedUsers.map((user) =>
        [
          user.id,
          `"${user.first_name}"`,
          `"${user.last_name}"`,
          `"${user.email}"`,
          user.is_staff ? "Администратор" : "Пользователь",
          user.is_active ? "Активен" : "Неактивен",
          `"${formatDate(user.last_login)}"`,
          `"${formatDate(user.date_joined)}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredAndSortedUsers, formatDate]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Управление пользователями
          </h1>
          <p className="text-muted-foreground">
            Обзор всех пользователей системы
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            disabled={filteredAndSortedUsers.length === 0}
          >
            <IconFileTypeCsv className="mr-2 h-4 w-4" />
            Экспорт CSV
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
          >
            <IconRefresh
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Обновить
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconUsers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Всего пользователей
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconCheck className="h-4 w-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Активных
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconShield className="h-4 w-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Администраторов
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.staffUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconX className="h-4 w-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Неактивных
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.inactiveUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IconClock className="h-4 w-4" />
              <span className="text-sm font-medium text-muted-foreground">
                Активных за месяц
              </span>
            </div>
            <div className="text-2xl font-bold">{stats.recentlyLoggedIn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени или email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Все роли" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все роли</SelectItem>
              <SelectItem value="staff">Администраторы</SelectItem>
              <SelectItem value="users">Пользователи</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="inactive">Неактивные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Таблица пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>
            Найдено {filteredAndSortedUsers.length} из {stats.totalUsers}{" "}
            пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="name">Пользователь</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="email">Email</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="role">Роль</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="status">Статус</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="last_login">Последний вход</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="date_joined">Дата регистрации</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <IconUser className="h-12 w-12 text-muted-foreground" />
                      <div className="space-y-1">
                        <h3 className="font-medium">Пользователи не найдены</h3>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ||
                          selectedRole !== "all" ||
                          selectedStatus !== "all"
                            ? "Попробуйте изменить критерии поиска"
                            : "В системе пока нет пользователей"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback>
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {getUserFullName(user)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconMail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_staff ? "default" : "secondary"}
                        className={cn(
                          user.is_staff &&
                            "bg-blue-100 text-blue-800 hover:bg-blue-200",
                        )}
                      >
                        <IconShield className="h-3 w-3 mr-1" />
                        {user.is_staff ? "Администратор" : "Пользователь"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? "outline" : "destructive"}
                        className={cn(
                          user.is_active &&
                            "bg-green-100 text-green-800 hover:bg-green-200 border-green-300",
                        )}
                      >
                        {user.is_active ? (
                          <>
                            <IconCheck className="h-3 w-3 mr-1" />
                            Активен
                          </>
                        ) : (
                          <>
                            <IconX className="h-3 w-3 mr-1" />
                            Неактивен
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <IconClock className="h-4 w-4 text-muted-foreground" />
                        {formatDate(user.last_login)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <IconCalendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(user.date_joined)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
