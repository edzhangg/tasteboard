import { PlaceDetail } from "@/components/PlaceDetail";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaceDetail placeId={id} />;
}
