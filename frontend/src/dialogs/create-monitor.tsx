import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMonitor, getProjects } from "@/lib/client";
import type { Monitor } from "@/lib/types";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";

const monitorSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().min(1, "Введите название монитора"),
    type: z.literal("ICMP"),
    projectId: z.number().min(1, "Выберите проект"),
    icmp: z.object({
      host: z.string().min(1, "Введите адрес хоста"),
    }),
  }),
  z.object({
    name: z.string().min(1, "Введите название монитора"),
    type: z.literal("HTTP"),
    projectId: z.number().min(1, "Выберите проект"),
    http: z.object({
      url: z.string().url("Введите корректный URL"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    }),
  }),
]);

type MonitorFormValues = z.infer<typeof monitorSchema>;

interface CreateMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMonitorDialog({
  open,
  onOpenChange,
}: CreateMonitorDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      name: "",
      type: "ICMP",
      icmp: { host: "" },
      http: { url: "", method: "GET" },
      projectId: 1,
    } as MonitorFormValues,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

  const createMonitorMutation = useMutation({
    mutationFn: (data: any) => createMonitor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      form.reset();
      onOpenChange(false);
    },
  });

  const [tab, setTab] = useState("ICMP");

  function onSubmit(values: MonitorFormValues) {
    // Подготавливаем данные для API на основе типа монитора
    const monitorData: Partial<Monitor> = {
      name: values.name,
      project: values.projectId,
      enabled: true,
    };

    if (values.type === "ICMP") {
      // Для ICMP мониторов используем HTTP тип с ping URL
      monitorData.type = "icmp";
      monitorData.url = values.icmp?.host;
    } else if (values.type === "HTTP") {
      monitorData.type = "http";
      monitorData.url = values.http?.url;
      monitorData.method = values.http?.method;
    }

    createMonitorMutation.mutate(monitorData);
  }

  const handleTabChange = (value: string) => {
    setTab(value);
    form.setValue("type", value as "ICMP" | "HTTP");

    // Очищаем поля неактивного типа монитора
    if (value === "ICMP") {
      form.setValue("http.url", "");
      form.setValue("http.method", "GET");
    } else if (value === "HTTP") {
      form.setValue("icmp.host", "");
    }

    // Очищаем ошибки
    form.clearErrors();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Создать монитор</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Введите название монитора"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isLoading && (
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Проект</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem
                              key={project.id}
                              value={project.id.toString()}
                            >
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Tabs
              value={tab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="mb-2">
                <TabsTrigger value="ICMP">ICMP</TabsTrigger>
                <TabsTrigger value="HTTP">HTTP</TabsTrigger>
              </TabsList>

              <TabsContent value="ICMP" className="space-y-4">
                <FormField
                  control={form.control}
                  name="icmp.host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Хост</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="HTTP" className="space-y-4">
                <FormField
                  control={form.control}
                  name="http.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="http.method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Метод</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите метод" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="submit" disabled={createMonitorMutation.isPending}>
                {createMonitorMutation.isPending ? "Создание..." : "Создать"}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Отмена
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
