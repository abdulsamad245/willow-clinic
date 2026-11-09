import { BookingApp } from "@/components/BookingApp";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <BookingApp initialView={view === "lookup" ? "lookup" : "book"} />;
}
