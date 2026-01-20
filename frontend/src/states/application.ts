import { proxy } from "valtio";

export interface User {
  name: string;
  email: string;
  avatar?: string;

  staff: boolean;
}

export const application = proxy<{
  header?: string;

  creation: {
    panel: boolean;
    monitor: boolean;
  };

  tvMode: boolean;

  user?: User;
}>({
  tvMode: false,
  creation: { panel: false, monitor: false },
});
