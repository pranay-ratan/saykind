"use client";

import { Image, View } from "react-native";
import CafeArt from "@/components/cafe/Art";
import type { LearnItem } from "@/lib/saykind/items";
import ObjectArt from "./ObjectArt";

/** The picture for whatever is being learned: a drawn object, a menu picture, or a photo the person took. */
export default function SubjectArt({ item }: { item: LearnItem }) {
  if (item.art.kind === "object") return <ObjectArt id={item.art.id} />;
  if (item.art.kind === "cafe") return <CafeArt id={item.art.id} />;
  return (
    <View style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#D5DED9" }}>
      <Image source={{ uri: item.art.uri }} resizeMode="cover" alt="" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}
