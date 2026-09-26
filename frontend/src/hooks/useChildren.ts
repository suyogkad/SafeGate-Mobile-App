import { useQuery } from "@tanstack/react-query";
import { getChild, listChildren } from "../api/children";

export function useChildren() {
  return useQuery({
    queryKey: ["children"],
    queryFn: listChildren,
  });
}

export function useChild(id: string | undefined) {
  return useQuery({
    queryKey: ["children", "detail", id],
    queryFn: () => getChild(id as string),
    enabled: Boolean(id),
  });
}
