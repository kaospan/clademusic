import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUpdateTheme, useThemePresets, useApplyPreset, useCreateTheme } from '@/hooks/api/useThemes';
import { Loader2, Palette, Type, Layout, Code, Wand2 } from 'lucide-react';

interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
}

interface ThemeFonts {
  heading: string;
  body: string;
}

interface ThemeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTheme?: {
    colors: ThemeColors;
    fonts: ThemeFonts;
    layout: string;
    custom_css?: string | null;
    player_skin: string;
    animated_background: boolean;
  } | null;
  userId: string;
}

const defaultColors: ThemeColors = {
  background: '#000000',
  surface: '#1a1a1a',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  text: '#ffffff',
  textMuted: '#9ca3af',
};

const defaultFonts: ThemeFonts = {
  heading: 'Inter',
  body: 'Inter',
};

const fontOptions = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Lora', 'Merriweather',
  'Roboto Mono', 'Fira Code', 'Source Code Pro',
  'Orbitron', 'Press Start 2P', 'Audiowide'
];

const layoutOptions = [
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'retro', label: 'Retro' },
  { value: 'neon', label: 'Neon' },
  { value: 'academic', label: 'Academic' }
];

const playerSkinOptions = [
  { value: 'default', label: 'Default' },
  { value: 'compact', label: 'Compact' },
  { value: 'glassmorphism', label: 'Glassmorphism' },
  { value: 'retro', label: 'Retro' },
  { value: 'minimal', label: 'Minimal' }
];

export function ThemeEditor({ open, onOpenChange, currentTheme, userId }: ThemeEditorProps) {
  const { toast } = useToast();
  const [colors, setColors] = useState<ThemeColors>(currentTheme?.colors || defaultColors);
  const [fonts, setFonts] = useState<ThemeFonts>(currentTheme?.fonts || defaultFonts);
  const [layout, setLayout] = useState(currentTheme?.layout || 'modern');
  const [customCss, setCustomCss] = useState(currentTheme?.custom_css || '');
  const [playerSkin, setPlayerSkin] = useState(currentTheme?.player_skin || 'default');
  const [animatedBg, setAnimatedBg] = useState(currentTheme?.animated_background || false);

  const { data: presets } = useThemePresets();
  const updateTheme = useUpdateTheme();
  const createTheme = useCreateTheme();
  const applyPreset = useApplyPreset();

  useEffect(() => {
    if (currentTheme) {
      setColors(currentTheme.colors);
      setFonts(currentTheme.fonts);
      setLayout(currentTheme.layout);
      setCustomCss(currentTheme.custom_css || '');
      setPlayerSkin(currentTheme.player_skin);
      setAnimatedBg(currentTheme.animated_background);
    }
  }, [currentTheme]);

  const handleSave = async () => {
    try {
      const themeData = {
        colors,
        fonts,
        layout,
        custom_css: customCss || null,
        player_skin: playerSkin,
        animated_background: animatedBg,
      };

      if (currentTheme) {
        await updateTheme.mutateAsync({ userId, updates: themeData });
      } else {
        await createTheme.mutateAsync({ user_id: userId, ...themeData });
      }

      toast({
        title: 'Theme saved',
        description: 'Your profile theme has been updated successfully.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error saving theme',
        description: error instanceof Error ? error.message : 'Failed to save theme',
        variant: 'destructive',
      });
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      const result = await applyPreset.mutateAsync({ userId, presetId });
      setColors(result.colors as ThemeColors);
      setFonts(result.fonts as ThemeFonts);
      setLayout(result.layout);
      setCustomCss(result.custom_css || '');
      setPlayerSkin(result.player_skin || 'default');
      setAnimatedBg(result.animated_background);

      toast({
        title: 'Preset applied',
        description: 'Theme preset has been applied to the editor.',
      });
    } catch (error) {
      toast({
        title: 'Error applying preset',
        description: error instanceof Error ? error.message : 'Failed to apply preset',
        variant: 'destructive',
      });
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleFontChange = (key: keyof ThemeFonts, value: string) => {
    setFonts(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Editor
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="presets" className="flex items-center gap-1">
                  <Wand2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Presets</span>
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  <span className="hidden sm:inline">Colors</span>
                </TabsTrigger>
                <TabsTrigger value="fonts" className="flex items-center gap-1">
                  <Type className="w-3 h-3" />
                  <span className="hidden sm:inline">Fonts</span>
                </TabsTrigger>
                <TabsTrigger value="layout" className="flex items-center gap-1">
                  <Layout className="w-3 h-3" />
                  <span className="hidden sm:inline">Layout</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-1">
                  <Code className="w-3 h-3" />
                  <span className="hidden sm:inline">Advanced</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(90vh-180px)] mt-4">
                <TabsContent value="presets" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-made theme and customize it to your liking.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {presets?.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.id)}
                        className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
                      >
                        <div 
                          className="w-12 h-12 rounded border shrink-0"
                          style={{ 
                            background: `linear-gradient(135deg, ${(preset.colors as ThemeColors).primary}, ${(preset.colors as ThemeColors).secondary})`
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{preset.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {preset.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {preset.is_featured && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                Featured
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {preset.usage_count} uses
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="colors" className="space-y-4">
                  {Object.entries(colors).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key} className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={key}
                          type="color"
                          value={value}
                          onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value)}
                          className="w-20 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={value}
                          onChange={(e) => handleColorChange(key as keyof ThemeColors, e.target.value)}
                          className="flex-1"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="fonts" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heading-font">Heading Font</Label>
                    <Select value={fonts.heading} onValueChange={(v) => handleFontChange('heading', v)}>
                      <SelectTrigger id="heading-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-font">Body Font</Label>
                    <Select value={fonts.body} onValueChange={(v) => handleFontChange('body', v)}>
                      <SelectTrigger id="body-font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="layout-select">Layout Style</Label>
                    <Select value={layout} onValueChange={setLayout}>
                      <SelectTrigger id="layout-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {layoutOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="player-skin">Player Skin</Label>
                    <Select value={playerSkin} onValueChange={setPlayerSkin}>
                      <SelectTrigger id="player-skin">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {playerSkinOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="animated-bg">Animated Background</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable subtle background animation
                      </p>
                    </div>
                    <Switch
                      id="animated-bg"
                      checked={animatedBg}
                      onCheckedChange={setAnimatedBg}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-css">Custom CSS</Label>
                    <p className="text-sm text-muted-foreground">
                      Advanced: Add custom CSS to further customize your profile
                    </p>
                    <Textarea
                      id="custom-css"
                      value={customCss}
                      onChange={(e) => setCustomCss(e.target.value)}
                      placeholder=".profile-header { ... }"
                      className="font-mono text-sm min-h-[200px]"
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Live Preview Panel */}
          <div 
            className="w-80 rounded-lg border p-4 overflow-hidden"
            style={{
              backgroundColor: colors.background,
              color: colors.text,
              fontFamily: fonts.body,
            }}
          >
            <h3 className="text-sm font-medium mb-3" style={{ fontFamily: fonts.heading }}>
              Live Preview
            </h3>
            <div className="space-y-3">
              <div 
                className="p-3 rounded"
                style={{ backgroundColor: colors.surface }}
              >
                <h4 className="font-semibold mb-1" style={{ fontFamily: fonts.heading, color: colors.primary }}>
                  Heading Text
                </h4>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  This is how your body text will appear on your profile.
                </p>
              </div>

              <button
                className="w-full py-2 px-4 rounded font-medium"
                style={{ backgroundColor: colors.primary, color: colors.background }}
              >
                Primary Button
              </button>

              <button
                className="w-full py-2 px-4 rounded font-medium"
                style={{ backgroundColor: colors.secondary, color: colors.background }}
              >
                Secondary Button
              </button>

              <div 
                className="p-2 rounded text-sm"
                style={{ backgroundColor: colors.accent, color: colors.background }}
              >
                Accent Color
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTheme.isPending || createTheme.isPending}>
            {(updateTheme.isPending || createTheme.isPending) && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Save Theme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
