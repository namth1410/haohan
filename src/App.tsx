import {
  CodeOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FolderAddOutlined,
  FolderOutlined,
  HomeOutlined,
  LeftOutlined,
  MoonOutlined,
  PlayCircleFilled,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SoundOutlined,
  SunOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  ConfigProvider,
  Empty,
  Input,
  Layout,
  message,
  Modal,
  Progress,
  Space,
  Spin,
  Table,
  theme,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import LazyThumbnail from "./components/LazyThumbnail";
import { useTheme } from "./context/ThemeContext";
import { api } from "./services/api";
import type { BreadcrumbItem, FileItem } from "./types";
import {
  formatDate,
  formatFileSize,
  getFileCategory,
  getFileExtension,
  isPreviewable,
} from "./utils/file";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// Helper to check if file is media (image or video)
const isMediaFile = (fileName: string): boolean => {
  const category = getFileCategory(fileName);
  return category === "image" || category === "video";
};

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [transitionClass, setTransitionClass] = useState("anim-fade-scale");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);
  const welcomeContainerRef = useRef<HTMLDivElement>(null);
  const welcomeTextRef = useRef<HTMLSpanElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);

  const animationClasses = [
    "anim-fade-scale",
    "anim-zoom-in",
    "anim-zoom-out",
    "anim-slide-up",
    "anim-slide-down",
    "anim-flip-x",
    "anim-flip-y",
    "anim-rotate-in",
    "anim-blur-in",
  ];

  // Theme
  const { isDark, toggleTheme } = useTheme();

  // Get list of media files only (images and videos)
  const mediaFiles = useMemo(() => {
    return files.filter(
      (file) => file.type === "file" && isMediaFile(file.name)
    );
  }, [files]);

  // Check if marquee is needed (text overflows container)
  useEffect(() => {
    const checkOverflow = () => {
      if (welcomeContainerRef.current && welcomeTextRef.current) {
        const containerWidth = welcomeContainerRef.current.offsetWidth;
        const textWidth = welcomeTextRef.current.scrollWidth;
        setNeedsMarquee(textWidth > containerWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  // Check if slideshow navigation should be shown
  const showSlideshow = useMemo(() => {
    return (
      mediaFiles.length > 1 && previewFile && isMediaFile(previewFile.name)
    );
  }, [mediaFiles, previewFile]);

  // Build breadcrumbs from prefix
  const buildBreadcrumbs = useCallback((prefix: string): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ title: "Home", path: "" }];

    if (prefix) {
      const parts = prefix.split("/").filter(Boolean);
      let path = "";

      for (const part of parts) {
        path += `${part}/`;
        items.push({ title: part, path });
      }
    }

    return items;
  }, []);

  // Load files
  const loadFiles = useCallback(
    async (prefix: string = "") => {
      setLoading(true);
      try {
        const result = await api.listFiles(prefix);
        setFiles(result.items);
        setCurrentPrefix(prefix);
        setBreadcrumbs(buildBreadcrumbs(prefix));
      } catch (error) {
        message.error("Không thể tải danh sách file");
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [buildBreadcrumbs]
  );

  // Check bucket on mount
  useEffect(() => {
    const init = async () => {
      try {
        await api.checkBucket();
        loadFiles();
      } catch (error) {
        message.error("Không thể kết nối đến MinIO server");
        console.error(error);
      }
    };

    init();
  }, [loadFiles]);

  // Handle keyboard navigation for slideshow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewVisible || !showSlideshow) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigatePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigateNext();
      } else if (e.key === "Escape") {
        setPreviewVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewVisible, showSlideshow, currentMediaIndex, mediaFiles]);

  // Handle folder click
  const handleFolderClick = (folder: FileItem) => {
    loadFiles(folder.path);
  };

  // Handle breadcrumb click
  const handleBreadcrumbClick = (path: string) => {
    loadFiles(path);
  };

  // Load preview content for a file
  const loadPreviewContent = async (file: FileItem) => {
    setPreviewLoading(true);
    setPreviewContent(null);

    try {
      const ext = getFileExtension(file.name);
      const category = getFileCategory(file.name);

      if (
        category === "image" ||
        category === "video" ||
        category === "audio" ||
        ext === "pdf"
      ) {
        setPreviewContent(api.getPreviewUrl(file.path));
      } else {
        const response = await fetch(api.getPreviewUrl(file.path));
        const text = await response.text();
        setPreviewContent(text);
      }
    } catch (error) {
      message.error("Không thể xem trước file");
      console.error(error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle file preview
  const handlePreview = async (file: FileItem) => {
    if (!isPreviewable(file.name)) {
      message.info("Không thể xem trước file này");
      return;
    }

    // Find index in media files if it's a media file
    if (isMediaFile(file.name)) {
      const index = mediaFiles.findIndex((f) => f.path === file.path);
      setCurrentMediaIndex(index >= 0 ? index : 0);
    }

    setPreviewFile(file);
    setPreviewVisible(true);
    await loadPreviewContent(file);
  };

  // Scroll thumbnail into view
  const scrollThumbnailIntoView = (index: number) => {
    if (thumbnailStripRef.current) {
      const thumbnails = thumbnailStripRef.current.children;
      if (thumbnails[index]) {
        (thumbnails[index] as HTMLElement).scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  };

  // Get random animation class
  const getRandomAnimation = () => {
    const randomIndex = Math.floor(Math.random() * animationClasses.length);
    return animationClasses[randomIndex];
  };

  // Navigate to previous media file
  const navigatePrev = async () => {
    if (mediaFiles.length === 0) return;

    const newIndex =
      currentMediaIndex > 0 ? currentMediaIndex - 1 : mediaFiles.length - 1;
    setCurrentMediaIndex(newIndex);
    setAnimationKey((prev) => prev + 1);
    setTransitionClass(getRandomAnimation());
    scrollThumbnailIntoView(newIndex);

    const prevFile = mediaFiles[newIndex];
    setPreviewFile(prevFile);
    await loadPreviewContent(prevFile);
  };

  // Navigate to next media file
  const navigateNext = async () => {
    if (mediaFiles.length === 0) return;

    const newIndex =
      currentMediaIndex < mediaFiles.length - 1 ? currentMediaIndex + 1 : 0;
    setCurrentMediaIndex(newIndex);
    setAnimationKey((prev) => prev + 1);
    setTransitionClass(getRandomAnimation());
    scrollThumbnailIntoView(newIndex);

    const nextFile = mediaFiles[newIndex];
    setPreviewFile(nextFile);
    await loadPreviewContent(nextFile);
  };

  // Navigate to specific index (for thumbnail click)
  const navigateToIndex = async (index: number) => {
    if (index < 0 || index >= mediaFiles.length) return;

    setCurrentMediaIndex(index);
    setAnimationKey((prev) => prev + 1);
    setTransitionClass(getRandomAnimation());
    scrollThumbnailIntoView(index);

    const file = mediaFiles[index];
    setPreviewFile(file);
    await loadPreviewContent(file);
  };

  // Handle file download
  const handleDownload = (file: FileItem) => {
    window.open(api.getDownloadUrl(file.path), "_blank");
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = uploadedFiles.length;
    let completedFiles = 0;

    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        await api.uploadFile(file, currentPrefix);
        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      message.success(`Đã tải lên ${completedFiles} file thành công!`);
      loadFiles(currentPrefix);
    } catch (error) {
      message.error("Tải file lên thất bại");
      console.error(error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      message.error("Vui lòng nhập tên thư mục");
      return;
    }

    try {
      await api.createFolder(newFolderName.trim(), currentPrefix);
      message.success("Đã tạo thư mục thành công!");
      setNewFolderModalVisible(false);
      setNewFolderName("");
      loadFiles(currentPrefix);
    } catch (error) {
      message.error("Không thể tạo thư mục");
      console.error(error);
    }
  };

  // Start slideshow from first media file
  const handleStartSlideshow = () => {
    if (mediaFiles.length === 0) {
      message.info("Không có file ảnh hoặc video trong thư mục này");
      return;
    }

    setCurrentMediaIndex(0);
    const firstMedia = mediaFiles[0];
    setPreviewFile(firstMedia);
    setPreviewVisible(true);
    loadPreviewContent(firstMedia);
  };

  // Get file icon based on category
  const getFileIcon = (file: FileItem) => {
    if (file.type === "folder") {
      return <FolderOutlined style={{ fontSize: 24, color: "#faad14" }} />;
    }

    const category = getFileCategory(file.name);
    const iconStyle = { fontSize: 24 };

    switch (category) {
      case "image":
        return <FileImageOutlined style={{ ...iconStyle, color: "#52c41a" }} />;
      case "video":
        return (
          <PlayCircleOutlined style={{ ...iconStyle, color: "#eb2f96" }} />
        );
      case "audio":
        return <SoundOutlined style={{ ...iconStyle, color: "#722ed1" }} />;
      case "document":
        return <FilePdfOutlined style={{ ...iconStyle, color: "#fa541c" }} />;
      case "code":
        return <CodeOutlined style={{ ...iconStyle, color: "#1890ff" }} />;
      case "text":
        return <FileTextOutlined style={{ ...iconStyle, color: "#595959" }} />;
      case "archive":
        return <FileZipOutlined style={{ ...iconStyle, color: "#faad14" }} />;
      default:
        return <FileOutlined style={{ ...iconStyle, color: "#8c8c8c" }} />;
    }
  };

  // Render preview content
  const renderPreviewContent = () => {
    if (previewLoading) {
      return (
        <div className="preview-loading">
          <Spin size="large" />
        </div>
      );
    }

    if (!previewFile || !previewContent) {
      return <Empty description="Không có nội dung" />;
    }

    const ext = getFileExtension(previewFile.name);
    const category = getFileCategory(previewFile.name);

    if (category === "image") {
      return (
        <img
          key={animationKey}
          src={previewContent}
          alt={previewFile.name}
          className={`preview-image ${transitionClass}`}
        />
      );
    }

    if (category === "video") {
      return (
        <video
          controls
          className={`preview-video ${transitionClass}`}
          key={`${previewContent}-${animationKey}`}
        >
          <source src={previewContent} />
          Trình duyệt không hỗ trợ video.
        </video>
      );
    }

    if (category === "audio") {
      return (
        <audio controls className="preview-audio">
          <source src={previewContent} />
          Trình duyệt không hỗ trợ audio.
        </audio>
      );
    }

    if (ext === "pdf") {
      return (
        <iframe
          src={previewContent}
          className="preview-pdf"
          title={previewFile.name}
        />
      );
    }

    // Text content
    return <pre className="preview-text">{previewContent}</pre>;
  };

  // Table columns
  const columns: ColumnsType<FileItem> = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <Space className="file-name-cell">
          {getFileIcon(record)}
          {record.type === "folder" ? (
            <a
              onClick={() => handleFolderClick(record)}
              className="folder-link"
            >
              {name}
            </a>
          ) : (
            <span>{name}</span>
          )}
        </Space>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type, record) => (
        <Text type="secondary">
          {type === "folder"
            ? "Thư mục"
            : getFileExtension(record.name).toUpperCase() || "File"}
        </Text>
      ),
    },
    {
      title: "Kích thước",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size, record) => (
        <Text type="secondary">
          {record.type === "folder" ? "-" : formatFileSize(size)}
        </Text>
      ),
    },
    {
      title: "Ngày sửa đổi",
      dataIndex: "lastModified",
      key: "lastModified",
      width: 180,
      render: (date) => <Text type="secondary">{formatDate(date)}</Text>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space>
          {record.type === "file" && (
            <>
              {isPreviewable(record.name) && (
                <Tooltip title="Xem trước">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(record)}
                    className="action-btn preview-btn"
                  />
                </Tooltip>
              )}
              <Tooltip title="Tải xuống">
                <Button
                  type="text"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record)}
                  className="action-btn download-btn"
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 8,
          colorBgContainer: isDark ? "#1e1e2e" : "#ffffff",
          colorBgLayout: isDark ? "#11111b" : "#f8fafc",
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
        components: {
          Layout: {
            headerBg: isDark
              ? "linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          },
          Table: {
            headerBg: isDark ? "#2d2d3f" : "#f1f5f9",
            rowHoverBg: isDark ? "#2d2d3f" : "#f1f5f9",
          },
        },
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <Title level={3} className="app-title">
                Hảo hán
              </Title>
              <div
                className="welcome-message-container"
                ref={welcomeContainerRef}
              >
                <span
                  className={`welcome-message ${needsMarquee ? "marquee" : ""}`}
                  ref={welcomeTextRef}
                >
                  <span className="welcome-text">
                    Chúng ta cùng nhau tải những hình ảnh lên đây để lưu giữ
                    thanh xuân của 2 vua nhé ❤️
                  </span>
                  {needsMarquee && (
                    <span className="welcome-text">
                      Chúng ta cùng nhau tải những hình ảnh lên đây để lưu giữ
                      thanh xuân của 2 vua nhé ❤️
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <Space>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  id="file-upload-input"
                />
                {mediaFiles.length > 0 && (
                  <Tooltip title="Trình chiếu ảnh/video">
                    <Button
                      icon={<PlayCircleFilled />}
                      onClick={handleStartSlideshow}
                      className="slideshow-btn"
                    >
                      Trình chiếu ({mediaFiles.length})
                    </Button>
                  </Tooltip>
                )}
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={isUploading}
                  className="upload-btn"
                >
                  Tải lên
                </Button>
                <Button
                  icon={<FolderAddOutlined />}
                  onClick={() => setNewFolderModalVisible(true)}
                  className="create-folder-btn"
                >
                  Tạo thư mục
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => loadFiles(currentPrefix)}
                  className="refresh-btn"
                />

                <Button
                  onClick={toggleTheme}
                  className="theme-toggle-btn"
                  icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                />
              </Space>
            </div>
          </div>
        </Header>

        <Content className="app-content">
          {isUploading && (
            <div className="upload-progress">
              <Progress
                percent={uploadProgress}
                status="active"
                strokeColor="#6366f1"
              />
              <Text>Đang tải lên...</Text>
            </div>
          )}

          <div className="breadcrumb-container">
            <Breadcrumb
              items={breadcrumbs.map((item, index) => ({
                key: index,
                title:
                  index === 0 ? (
                    <a onClick={() => handleBreadcrumbClick(item.path)}>
                      <HomeOutlined /> {item.title}
                    </a>
                  ) : (
                    <a onClick={() => handleBreadcrumbClick(item.path)}>
                      {item.title}
                    </a>
                  ),
              }))}
            />
          </div>

          <div className="table-container">
            <Table
              columns={columns}
              dataSource={files}
              rowKey="path"
              loading={loading}
              pagination={false}
              locale={{
                emptyText: (
                  <Empty
                    description="Thư mục trống"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              className="files-table"
            />
          </div>
        </Content>

        {/* Preview Modal with Slideshow Navigation */}
        <Modal
          title={
            <div className="preview-modal-title">
              <span>{previewFile?.name}</span>
              {showSlideshow && (
                <span className="preview-counter">
                  {currentMediaIndex + 1} / {mediaFiles.length}
                </span>
              )}
            </div>
          }
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={null}
          width={1000}
          className="preview-modal"
          centered
        >
          <div className="preview-container">
            {/* Left Navigation Arrow */}
            {showSlideshow && (
              <button
                className="nav-arrow nav-arrow-left"
                onClick={navigatePrev}
                title="Ảnh trước (←)"
              >
                <LeftOutlined />
              </button>
            )}

            {/* Preview Content */}
            <div className="preview-content-wrapper">
              {renderPreviewContent()}
            </div>

            {/* Right Navigation Arrow */}
            {showSlideshow && (
              <button
                className="nav-arrow nav-arrow-right"
                onClick={navigateNext}
                title="Ảnh tiếp (→)"
              >
                <RightOutlined />
              </button>
            )}
          </div>

          {/* Thumbnail Strip */}
          {showSlideshow && (
            <div className="thumbnail-strip" ref={thumbnailStripRef}>
              {mediaFiles.map((file, index) => (
                <LazyThumbnail
                  key={file.path}
                  src={api.getPreviewUrl(file.path)}
                  alt={file.name}
                  isVideo={getFileCategory(file.name) === "video"}
                  isActive={index === currentMediaIndex}
                  onClick={() => navigateToIndex(index)}
                />
              ))}
            </div>
          )}
        </Modal>

        {/* New Folder Modal */}
        <Modal
          title="Tạo thư mục mới"
          open={newFolderModalVisible}
          onOk={handleCreateFolder}
          onCancel={() => {
            setNewFolderModalVisible(false);
            setNewFolderName("");
          }}
          okText="Tạo"
          cancelText="Hủy"
          className="new-folder-modal"
          centered
        >
          <Input
            placeholder="Nhập tên thư mục"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onPressEnter={handleCreateFolder}
            autoFocus
            prefix={<FolderOutlined style={{ color: "#faad14" }} />}
          />
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
