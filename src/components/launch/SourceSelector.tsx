import { useEffect, useState } from "react";
import { MdCheck } from "react-icons/md";
import { useScopedT } from "@/contexts/I18nContext";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import styles from "./SourceSelector.module.css";

interface DesktopSource {
	id: string;
	name: string;
	thumbnail: string | null;
	display_id: string;
	appIcon: string | null;
}

export function SourceSelector() {
	const t = useScopedT("launch");
	const tc = useScopedT("common");
	const [sources, setSources] = useState<DesktopSource[]>([]);
	const [selectedSource, setSelectedSource] = useState<DesktopSource | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("screens");

	useEffect(() => {
		async function fetchSources() {
			setLoading(true);
			try {
				const currentSource = await window.electronAPI.getSelectedSource();
				const rawSources = await window.electronAPI.getSources({
					types: ["screen", "window"],
					thumbnailSize: { width: 320, height: 180 },
					fetchWindowIcons: true,
				});
				const normalizedSources = rawSources.map((source) => ({
					id: source.id,
					name:
						source.id.startsWith("window:") && source.name.includes(" — ")
							? source.name.split(" — ")[1] || source.name
							: source.name,
					thumbnail: source.thumbnail,
					display_id: source.display_id,
					appIcon: source.appIcon,
				}));
				setSources(normalizedSources);

				if (currentSource) {
					const matchingSource = normalizedSources.find((source) => source.id === currentSource.id);
					if (matchingSource) {
						setSelectedSource(matchingSource);
						setActiveTab(matchingSource.id.startsWith("window:") ? "windows" : "screens");
						return;
					}
				}

				setActiveTab(
					normalizedSources.some((source) => source.id.startsWith("screen:"))
						? "screens"
						: "windows",
				);
			} catch (error) {
				console.error("Error loading sources:", error);
			} finally {
				setLoading(false);
			}
		}
		fetchSources();
	}, []);

	const screenSources = sources.filter((s) => s.id.startsWith("screen:"));
	const windowSources = sources.filter((s) => s.id.startsWith("window:"));

	const handleSourceSelect = (source: DesktopSource) => setSelectedSource(source);
	const handleShare = async () => {
		if (selectedSource) await window.electronAPI.selectSource(selectedSource);
	};

	if (loading) {
		return (
			<div className={styles.viewport}>
				<div className={styles.panel}>
					<div className={styles.loadingState}>
						<div className={styles.loadingSpinner} />
						<p className={styles.loadingLabel}>{t("sourceSelector.loading")}</p>
					</div>
				</div>
			</div>
		);
	}

	const renderSourceCard = (source: DesktopSource) => {
		const isSelected = selectedSource?.id === source.id;
		return (
			<button
				key={source.id}
				type="button"
				className={`${styles.sourceRow} ${isSelected ? styles.selected : ""}`}
				onClick={() => handleSourceSelect(source)}
				onDoubleClick={() => {
					void window.electronAPI.selectSource(source);
				}}
			>
				<div className={styles.thumbnailWrap}>
					{source.thumbnail ? (
						<img src={source.thumbnail} alt={source.name} className={styles.thumbnail} />
					) : (
						<div className={styles.thumbnailFallback} />
					)}
				</div>
				<div className={styles.sourceMeta}>
					<div className={styles.sourceTitleRow}>
						{source.appIcon && <img src={source.appIcon} alt="" className={styles.icon} />}
						<div className={styles.name}>{source.name}</div>
					</div>
					<div className={styles.detailRow}>
						<span className={styles.detailText}>
							{source.id.startsWith("screen:")
								? t("sourceSelector.defaultSourceName")
								: t("sourceSelector.windowLabel")}
						</span>
						{source.id.startsWith("screen:") && source.display_id && (
							<span className={styles.detailText}>
								{t("sourceSelector.displayLabel", { id: source.display_id })}
							</span>
						)}
					</div>
				</div>
				<div className={styles.selectionSlot}>
					{isSelected && (
						<div className={styles.checkBadge}>
							<MdCheck size={14} className={styles.checkIcon} />
						</div>
					)}
				</div>
			</button>
		);
	};

	return (
		<div className={styles.viewport}>
			<div className={styles.panel}>
				<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
					<TabsList className={styles.tabList}>
						<TabsTrigger value="screens" className={styles.tabTrigger}>
							{t("sourceSelector.screens", {
								count: String(screenSources.length),
							})}
						</TabsTrigger>
						<TabsTrigger value="windows" className={styles.tabTrigger}>
							{t("sourceSelector.windows", {
								count: String(windowSources.length),
							})}
						</TabsTrigger>
					</TabsList>
					<div className={styles.contentArea}>
						<TabsContent value="screens" className={styles.tabContent}>
							<div className={styles.sourceList}>
								{screenSources.length > 0 ? (
									screenSources.map(renderSourceCard)
								) : (
									<div className={styles.emptyState}>{t("sourceSelector.empty")}</div>
								)}
							</div>
						</TabsContent>
						<TabsContent value="windows" className={styles.tabContent}>
							<div className={styles.sourceList}>
								{windowSources.length > 0 ? (
									windowSources.map(renderSourceCard)
								) : (
									<div className={styles.emptyState}>{t("sourceSelector.empty")}</div>
								)}
							</div>
						</TabsContent>
					</div>
				</Tabs>
				<div className={styles.footer}>
					<Button variant="ghost" onClick={() => window.close()} className={styles.cancelButton}>
						{tc("actions.cancel")}
					</Button>
					<Button
						variant="ghost"
						onClick={handleShare}
						disabled={!selectedSource}
						className={styles.primaryButton}
					>
						{t("actions.useSource")}
					</Button>
				</div>
			</div>
		</div>
	);
}
