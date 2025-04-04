import ChatWS from "@/components/ChatWS";
import { Suspense } from "react";

export default function Home() {
  return (
      <Suspense fallback={null}>
        <ChatWS />
      </Suspense>
  );
}
