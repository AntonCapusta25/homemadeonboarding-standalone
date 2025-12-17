import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, Check, X } from 'lucide-react';

interface ParsedDish {
  name: string;
  description: string;
  price: number;
  category: string;
  is_upsell: boolean;
  sort_order: number;
}

interface MenuUploadSectionProps {
  chefId: string;
  chefName?: string | null;
  cuisines?: string[] | null;
  onMenuUpdated: () => void;
}

export function MenuUploadSection({ chefId, chefName, cuisines, onMenuUpdated }: MenuUploadSectionProps) {
  const [pastedContent, setPastedContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedDishes, setParsedDishes] = useState<ParsedDish[] | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Read file content
    try {
      let content = '';
      
      if (fileType === 'csv' || fileType === 'txt') {
        content = await file.text();
      } else if (fileType === 'json') {
        content = await file.text();
      } else {
        // For other files, read as text and let AI figure it out
        content = await file.text();
      }

      setPastedContent(content);
      toast({ title: 'File loaded', description: `${file.name} ready to parse` });
    } catch (err) {
      toast({ title: 'Error', description: 'Could not read file', variant: 'destructive' });
    }
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleParse = async () => {
    if (!pastedContent.trim()) {
      toast({ title: 'No content', description: 'Paste or upload menu content first', variant: 'destructive' });
      return;
    }

    setParsing(true);
    setParsedDishes(null);

    try {
      const { data, error } = await supabase.functions.invoke('parse-menu-upload', {
        body: {
          content: pastedContent,
          file_type: 'text',
          chef_name: chefName,
          cuisines: cuisines,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Parse failed');

      setParsedDishes(data.dishes);
      toast({ title: 'Parsed!', description: `Found ${data.dishes.length} dishes` });
    } catch (err: any) {
      toast({ title: 'Parse failed', description: err.message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!parsedDishes || parsedDishes.length === 0) return;

    setSaving(true);

    try {
      // Deactivate existing menus
      await supabase
        .from('menus')
        .update({ is_active: false })
        .eq('chef_profile_id', chefId);

      // Create new menu
      const { data: newMenu, error: menuError } = await supabase
        .from('menus')
        .insert({
          chef_profile_id: chefId,
          is_active: true,
          summary: `Imported ${parsedDishes.length} dishes`,
          average_margin: 40,
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // Insert dishes
      const dishInserts = parsedDishes.map((d, idx) => ({
        menu_id: newMenu.id,
        name: d.name,
        description: d.description,
        price: d.price,
        category: d.category,
        is_upsell: d.is_upsell,
        sort_order: idx,
        estimated_cost: d.price * 0.35,
        margin: 65,
      }));

      const { error: dishError } = await supabase.from('dishes').insert(dishInserts);
      if (dishError) throw dishError;

      toast({ title: 'Menu saved!', description: `${parsedDishes.length} dishes added` });
      setParsedDishes(null);
      setPastedContent('');
      onMenuUpdated();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setParsedDishes(null);
    setPastedContent('');
  };

  return (
    <Card className="p-4 space-y-4 border-dashed">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Upload New Menu</h4>
        {(pastedContent || parsedDishes) && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {!parsedDishes ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Paste menu content (CSV, text, or any format)</Label>
            <Textarea
              placeholder="Paste your menu here... (dish names, prices, descriptions - any format)"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt,.json,.doc,.docx"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
            <Button
              size="sm"
              onClick={handleParse}
              disabled={!pastedContent.trim() || parsing}
              className="gap-2"
            >
              {parsing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {parsing ? 'Parsing...' : 'Parse Menu'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            Found {parsedDishes.length} dishes. Review and save:
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded p-2">
            {parsedDishes.map((dish, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="truncate flex-1">{dish.name}</span>
                <span className="text-muted-foreground ml-2">{dish.category}</span>
                <span className="font-medium ml-2">€{dish.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setParsedDishes(null)}
            >
              Back to Edit
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMenu}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save as New Menu'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
