"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OffersList } from "./offers-list";
import { ConflictsList } from "./conflicts-list";
import { RechecksList } from "./rechecks-list";
import { ManualOfferForm } from "./manual-offer-form";

export function DataCollectionDashboard() {
  const [activeTab, setActiveTab] = useState("offers");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="offers">Offers</TabsTrigger>
        <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        <TabsTrigger value="rechecks">Recheck Requests</TabsTrigger>
        <TabsTrigger value="manual">Manual Input</TabsTrigger>
      </TabsList>

      <TabsContent value="offers" className="space-y-4">
        <OffersList />
      </TabsContent>

      <TabsContent value="conflicts" className="space-y-4">
        <ConflictsList />
      </TabsContent>

      <TabsContent value="rechecks" className="space-y-4">
        <RechecksList />
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <ManualOfferForm />
      </TabsContent>
    </Tabs>
  );
}
