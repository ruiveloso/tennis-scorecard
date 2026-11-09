import { useEffect, useRef, useState } from "react";
import { Download, Settings2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMatchStore, type Settings } from "@/lib/match-store";
import { LANG_LABELS, listVoices, sampleCall, speak, speechAvailable } from "@/lib/announcer";
import { screenWakeLockAvailable } from "@/hooks/use-screen-wake-lock";

export function SettingsSheet() {
  const settings = useMatchStore((s) => s.settings);
  const setSettings = useMatchStore((s) => s.setSettings);
  const exportBackup = useMatchStore((s) => s.exportBackup);
  const importBackup = useMatchStore((s) => s.importBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveBackup = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tennis-scorecard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const loadBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = importBackup(await file.text());
      toast.success(`Imported ${r.matches} match${r.matches === 1 ? "" : "es"} and ${r.coach} coach entr${r.coach === 1 ? "y" : "ies"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!speechAvailable()) return;
    const load = () => setVoices(listVoices(settings.lang));
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [settings.lang]);

  const toggles: { key: keyof Pick<Settings, "announce" | "showCues" | "showTags">; label: string }[] = [
    { key: "announce", label: "Announce the score aloud" },
    { key: "showCues", label: "Show cues (change ends, tiebreak, breaks)" },
    { key: "showTags", label: "Tag points (ace, double fault, winner, error)" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings2 aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="set-keepScreenAwake" className="leading-snug">Keep screen awake</Label>
              <Switch
                id="set-keepScreenAwake"
                checked={settings.keepScreenAwake}
                onCheckedChange={(v) => setSettings({ keepScreenAwake: v })}
                aria-describedby="wake-lock-description"
              />
            </div>
            <p id="wake-lock-description" className="text-sm text-muted-foreground">
              {screenWakeLockAvailable()
                ? "Keeps the screen on while a live match is open on Score, including the big scoreboard. Switching apps or battery-saving settings may let it sleep."
                : "Not supported in this browser or context. Use a supported browser over HTTPS to keep the screen on during live scoring."}
            </p>
          </div>
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4">
              <Label htmlFor={`set-${t.key}`} className="leading-snug">{t.label}</Label>
              <Switch id={`set-${t.key}`} checked={settings[t.key]} onCheckedChange={(v) => setSettings({ [t.key]: v })} />
            </div>
          ))}
          {!speechAvailable() && settings.announce && <p className="text-sm text-destructive">This browser cannot speak announcements.</p>}
          <div className="space-y-1.5">
            <Label htmlFor="set-lang">Announcer language</Label>
            <Select value={settings.lang} onValueChange={(v) => setSettings({ lang: v as Settings["lang"], voiceURI: "" })}>
              <SelectTrigger id="set-lang" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LANG_LABELS) as Settings["lang"][]).map((l) => (
                  <SelectItem key={l} value={l}>{LANG_LABELS[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-voice">Voice</Label>
            <Select value={settings.voiceURI || "default"} onValueChange={(v) => setSettings({ voiceURI: v === "default" ? "" : v })}>
              <SelectTrigger id="set-voice" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System default</SelectItem>
                {voices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => speak(sampleCall(settings.lang), settings.lang, settings.voiceURI)}>
              Test voice
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-surface">Court surface</Label>
            <Select value={settings.surface} onValueChange={(v) => setSettings({ surface: v as Settings["surface"] })}>
              <SelectTrigger id="set-surface" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hard">Hard court</SelectItem>
                <SelectItem value="clay">Clay</SelectItem>
                <SelectItem value="grass">Grass</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="set-weather" className="leading-snug">Record the weather with new matches</Label>
            <Switch id="set-weather" checked={settings.captureWeather} onCheckedChange={(v) => setSettings({ captureWeather: v })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-units">Weather units</Label>
            <Select value={settings.weatherUnits} onValueChange={(v) => setSettings({ weatherUnits: v as Settings["weatherUnits"] })}>
              <SelectTrigger id="set-units" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Metric">Metric (°C, km/h)</SelectItem>
                <SelectItem value="Imperial">Imperial (°F, mph)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 border-t pt-5">
            <p className="text-sm font-medium">Backup</p>
            <p className="text-sm text-muted-foreground">Your matches live only on this device. Save a backup file to keep them safe or move them to another device.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={saveBackup}><Download aria-hidden="true" /> Save backup</Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" /> Import backup</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => void loadBackup(e.target.files?.[0])} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
