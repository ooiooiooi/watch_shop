import { useState } from "react";
import { uploadImage } from "../api/adminApi";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { resolveMediaUrl } from "../utils/media";

export function ImageUpload({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {value ? (
        <div className="relative group rounded-md border border-[var(--line)] overflow-hidden bg-[var(--panel-2)] w-full h-[160px]">
          <img src={resolveMediaUrl(value)} alt="preview" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-red-600 text-sm text-white hover:bg-red-700 flex items-center gap-1 whitespace-nowrap shrink-0"
              onClick={() => onChange("")}
            >
              <X size={16} /> 删除
            </button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-[160px] rounded-md border-2 border-dashed border-[var(--line)] hover:border-primary hover:bg-[rgba(199,166,106,0.05)] transition-colors cursor-pointer bg-[var(--panel-2)]">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <Loader2 className="w-8 h-8 mb-3 text-[var(--muted)] animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8 mb-3 text-[var(--muted)]" />
            )}
            <p className="mb-2 text-sm text-[var(--muted)]">
              {uploading ? "正在上传..." : <><span className="font-semibold">点击上传</span> 或拖拽图片至此处</>}
            </p>
            <p className="text-xs text-[var(--muted)] opacity-70">PNG, JPG, WEBP (最大 5MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/gif, image/webp"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
      {error && <div className="text-sm text-red-300">{error}</div>}
      
      {/* 允许手动输入URL作为备用 */}
      <div className="flex gap-2 items-center mt-1">
        <span className="text-xs text-[var(--muted)] shrink-0">外部链接:</span>
        <input 
          className="admin-input w-full text-xs h-8"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
