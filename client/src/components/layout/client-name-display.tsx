import { useQuery } from "@tanstack/react-query";

export default function ClientNameDisplay() {
  const { data: clientConfig } = useQuery({
    queryKey: ["/api/system-config", "client_name"],
    queryFn: async () => {
      const response = await fetch("/api/system-config/client_name", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { value: "Demo Medical Practice" }; // Default fallback
        }
        throw new Error("Failed to fetch client name");
      }
      return response.json();
    },
  });

  if (!clientConfig?.value) {
    return null;
  }

  return (
    <div className="text-sm text-gray-600 font-medium">
      {clientConfig.value}
    </div>
  );
}