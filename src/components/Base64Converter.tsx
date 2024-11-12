import React, { useMemo, useState, useRef } from "react";

interface BackgroundOption {
  label: string;
  value: string;
  class: string;
}

const backgroundOptions: BackgroundOption[] = [
  { label: "Black", value: "black", class: "bg-black" },
  { label: "White", value: "white", class: "bg-white" },
  { label: "Transparent", value: "transparent", class: "bg-transparent" },
];

const Base64Converter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"image" | "base64">("image");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [base64Output, setBase64Output] = useState("");
  const [cssOutput, setCssOutput] = useState("");
  const [base64Input, setBase64Input] = useState("");
  const [copyText, setCopyText] = useState("Copy to Clipboard");
  const [background, setBackground] = useState<string>("transparent");

  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: "image" | "base64") => {
    setActiveTab(tab);
    setPreviewVisible(false);
    setPreviewSrc("");
    setBase64Output("");
    setCssOutput("");
    setBase64Input("");
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewSrc(base64);
      setBase64Output(base64);
      setCssOutput(`background-image: url(${base64});`);
      setPreviewVisible(true);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cssOutput);
    setCopyText("Copied!");
    setTimeout(() => setCopyText("Copy to Clipboard"), 2000);
  };

  const handleBase64Input = (value: string) => {
    setBase64Input(value);
    if (value.trim().startsWith("data:image")) {
      setPreviewSrc(value);
      setPreviewVisible(true);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = previewSrc;
    link.download = "converted-image";
    link.click();
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.select();
  };

  const bgStyle = useMemo(() => {
    if (background === "white") {
      return {
        background: "white",
      };
    }

    if (background === "black") {
      return {
        background: "black",
      };
    }

    return {
      background: `url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAAAXNSR0IArs4c6QAAAGxlWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAACQAAAAAQAAAJAAAAABAAKgAgAEAAAAAQAAAMCgAwAEAAAAAQAAAMAAAAAAJxHQzAAAAAlwSFlzAAAWJQAAFiUBSVIk8AAABERJREFUeAHt1cERgCAUA1F07In+j78qtQsOb2kAsskO1/uf1TlGYGaO3d3Fa91BiIBMIAHk9sveD9AGbAL9AHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG0AC2P3z6ROAn4ANIAHs/vn0CcBPwAaQAHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG0AC2P3z6ROAn4ANIAHs/vn0CcBPwAaQAHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG0AC2P3z6ROAn4ANIAHs/vn0CcBPwAaQAHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG0AC2P3z6ROAn4ANIAHs/vn0CcBPwAaQAHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG0AC2P3z6ROAn4ANIAHs/vn0CcBPwAaQAHb/fPoE4CdgA0gAu38+fQLwE7ABJIDdP58+AfgJ2AASwO6fT58A/ARsAAlg98+nTwB+AjaABLD759MnAD8BG8AzMzaBw+n33odfYF/fD2D3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9PnwD8BGwACWD3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9PnwD8BGwACWD3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9PnwD8BGwACWD3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9PnwD8BGwACWD3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9PnwD8BGwACWD3z6dPAH4CNoAEsPvn0ycAPwEbQALY/fPpE4CfgA0gAez++fQJwE/ABpAAdv98+gTgJ2ADSAC7fz59AvATsAEkgN0/nz4B+AnYABLA7p9P/wFAaQrZeIuPwgAAAABJRU5ErkJggg==)`,
      backgroundRepeat: "repeat",
      backgroundSize: "2%",
    };
  }, [background]);

  const PreviewBox = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      <div className={`p-4 rounded-lg`} style={bgStyle}>
        {children}
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full p-1">
        {backgroundOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setBackground(option.value)}
            className={`w-6 h-6 rounded-full border-2 ${option.class} ${
              background === option.value
                ? "border-blue-500"
                : "border-gray-300 hover:border-gray-400"
            }`}
            title={option.label}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 w-full rounded-lg p-6 mb-8">
      <div className="flex flex-grow items-center mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleTabChange("image")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "image"
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Image to Base64
          </button>
          <button
            onClick={() => handleTabChange("base64")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "base64"
                ? "bg-blue-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Base64 to Image
          </button>
        </div>
      </div>

      {activeTab === "image" ? (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("border-blue-500");
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove("border-blue-500");
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove("border-blue-500");
              handleDrop(e);
            }}
          >
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />
            <label
              htmlFor="imageInput"
              className="cursor-pointer text-gray-600 dark:text-gray-400"
              onClick={() => imageInputRef.current?.click()}
            >
              <span className="block mb-2">
                Drop image here or click to upload
              </span>
              <span className="text-sm">Supports PNG, JPG, WEBP</span>
            </label>
          </div>

          {previewVisible && (
            <div className="space-y-4">
              <PreviewBox>
                <img
                  src={previewSrc}
                  className="max-h-48 mx-auto"
                  alt="Preview"
                />
              </PreviewBox>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base64 Output
                </label>
                <textarea
                  value={base64Output}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-900 dark:text-gray-300 text-sm font-mono cursor-pointer"
                  readOnly
                  onClick={handleTextareaClick}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CSS Background
                </label>
                <textarea
                  value={cssOutput}
                  rows={4}
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-900 dark:text-gray-300 text-sm font-mono cursor-pointer"
                  readOnly
                  onClick={handleTextareaClick}
                />
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copyText}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paste Base64 Code
            </label>
            <textarea
              value={base64Input}
              onChange={(e) => handleBase64Input(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-900 text-sm font-mono"
              placeholder="Paste your base64 encoded image data here..."
            />
          </div>
          {previewVisible && (
            <div className="space-y-4">
              <PreviewBox>
                <img
                  src={previewSrc}
                  className="max-h-48 mx-auto"
                  alt="Converted"
                />
              </PreviewBox>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download Image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Base64Converter;
