import { ChevronDown, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { FaFolderOpen } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import {
	MdMic,
	MdMicOff,
	MdMonitor,
	MdRestartAlt,
	MdVideocam,
	MdVideocamOff,
	MdVideoFile,
	MdVolumeOff,
	MdVolumeUp,
} from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useI18n, useScopedT } from "@/contexts/I18nContext";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { getLocaleName } from "@/i18n/loader";
import { isMac as getIsMac } from "@/utils/platformUtils";
import { useAudioLevelMeter } from "../../hooks/useAudioLevelMeter";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { AudioLevelMeter } from "../ui/audio-level-meter";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";

const ICON_SIZE = 20;

const ICON_CONFIG = {
	drag: { icon: RxDragHandleDots2, size: ICON_SIZE },
	monitor: { icon: MdMonitor, size: ICON_SIZE },
	volumeOn: { icon: MdVolumeUp, size: ICON_SIZE },
	volumeOff: { icon: MdVolumeOff, size: ICON_SIZE },
	micOn: { icon: MdMic, size: ICON_SIZE },
	micOff: { icon: MdMicOff, size: ICON_SIZE },
	webcamOn: { icon: MdVideocam, size: ICON_SIZE },
	webcamOff: { icon: MdVideocamOff, size: ICON_SIZE },
	stop: { icon: FaRegStopCircle, size: ICON_SIZE },
	restart: { icon: MdRestartAlt, size: ICON_SIZE },
	record: { icon: BsRecordCircle, size: ICON_SIZE },
	videoFile: { icon: MdVideoFile, size: ICON_SIZE },
	folder: { icon: FaFolderOpen, size: ICON_SIZE },
	minimize: { icon: FiMinus, size: ICON_SIZE },
	close: { icon: FiX, size: ICON_SIZE },
} as const;

type IconName = keyof typeof ICON_CONFIG;

function getIcon(name: IconName, className?: string) {
	const { icon: Icon, size } = ICON_CONFIG[name];
	return <Icon size={size} className={className} />;
}

export function LaunchWindow() {
	const t = useScopedT("launch");
	const { locale, setLocale } = useI18n();
	const [isMac, setIsMac] = useState(false);

	useEffect(() => {
		getIsMac().then(setIsMac);
	}, []);

	const {
		recording,
		toggleRecording,
		restartRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
	} = useScreenRecorder();
	const [recordingStart, setRecordingStart] = useState<number | null>(null);
	const [elapsed, setElapsed] = useState(0);

	const showMicControls = microphoneEnabled && !recording;
	const { devices, selectedDeviceId, setSelectedDeviceId } =
		useMicrophoneDevices(microphoneEnabled);
	const { level } = useAudioLevelMeter({
		enabled: showMicControls,
		deviceId: microphoneDeviceId,
	});

	useEffect(() => {
		if (selectedDeviceId && selectedDeviceId !== "default") {
			setMicrophoneDeviceId(selectedDeviceId);
		}
	}, [selectedDeviceId, setMicrophoneDeviceId]);

	useEffect(() => {
		let timer: NodeJS.Timeout | null = null;
		if (recording) {
			if (!recordingStart) setRecordingStart(Date.now());
			timer = setInterval(() => {
				if (recordingStart) {
					setElapsed(Math.floor((Date.now() - recordingStart) / 1000));
				}
			}, 1000);
		} else {
			setRecordingStart(null);
			setElapsed(0);
			if (timer) clearInterval(timer);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [recording, recordingStart]);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	const [selectedSource, setSelectedSource] = useState("Screen");
	const [hasSelectedSource, setHasSelectedSource] = useState(false);

	useEffect(() => {
		let mounted = true;

		const syncSelectedSource = async () => {
			const source = await window.electronAPI?.getSelectedSource();
			if (!mounted) {
				return;
			}

			if (source) {
				setSelectedSource(source.name);
				setHasSelectedSource(true);
				return;
			}

			setSelectedSource(t("sourceSelector.defaultSourceName"));
			setHasSelectedSource(false);
		};

		void syncSelectedSource();
		const cleanup = window.electronAPI?.onSelectedSourceChange?.((source) => {
			if (source) {
				setSelectedSource(source.name);
				setHasSelectedSource(true);
				return;
			}

			setSelectedSource(t("sourceSelector.defaultSourceName"));
			setHasSelectedSource(false);
		});

		return () => {
			mounted = false;
			cleanup?.();
		};
	}, [t]);

	const openSourceSelector = () => {
		if (window.electronAPI) {
			window.electronAPI.openSourceSelector();
		}
	};

	const openVideoFile = async () => {
		const result = await window.electronAPI.openVideoFilePicker();

		if (result.canceled) {
			return;
		}

		if (result.success && result.path) {
			await window.electronAPI.setCurrentVideoPath(result.path);
			await window.electronAPI.switchToEditor();
		}
	};

	const openProjectFile = async () => {
		const result = await window.electronAPI.loadProjectFile();
		if (result.canceled || !result.success) return;
		await window.electronAPI.switchToEditor();
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};

	const toggleMicrophone = () => {
		if (!recording) {
			setMicrophoneEnabled(!microphoneEnabled);
		}
	};

	useEffect(() => {
		window.electronAPI?.setMicrophoneExpanded(showMicControls);
	}, [showMicControls]);

	const recordLabel = recording
		? formatTimePadded(elapsed)
		: hasSelectedSource
			? t("actions.record")
			: t("actions.selectSource");

	return (
		<div className={styles.root}>
			<div className={`${styles.stack} ${styles.electronDrag}`}>
				{showMicControls && (
					<div className={`${styles.micPanel} ${styles.electronNoDrag}`}>
						<div className={styles.micPanelLabel} title={t("audio.disableMicrophone")}>
							{getIcon("micOn", styles.micPanelIcon)}
						</div>
						<div className={styles.micSelectWrap}>
							<select
								value={microphoneDeviceId || selectedDeviceId}
								onChange={(e) => {
									setSelectedDeviceId(e.target.value);
									setMicrophoneDeviceId(e.target.value);
								}}
								className={styles.micSelect}
							>
								{devices.map((device) => (
									<option key={device.deviceId} value={device.deviceId}>
										{device.label}
									</option>
								))}
							</select>
							<ChevronDown size={12} className={styles.micSelectChevron} />
						</div>
						<AudioLevelMeter level={level} className={styles.micMeter} />
					</div>
				)}

				<div className={styles.hud}>
					<div className={styles.leftRail}>
						<div className={`${styles.dragHandle} ${styles.electronDrag}`}>
							{getIcon("drag", styles.dragIcon)}
						</div>

						<button
							className={`${styles.sourceButton} ${styles.electronNoDrag}`}
							onClick={openSourceSelector}
							disabled={recording}
							title={selectedSource}
						>
							<div className={styles.sourceLead}>
								{getIcon("monitor", styles.sourceIcon)}
								<div className={styles.sourceText}>
									<span className={styles.sourceName}>{selectedSource}</span>
									<span className={styles.sourceHint}>
										{hasSelectedSource ? t("actions.record") : t("actions.selectSource")}
									</span>
								</div>
							</div>
							<ChevronDown size={14} className={styles.sourceChevron} />
						</button>
					</div>

					<div className={`${styles.toggleRail} ${styles.electronNoDrag}`}>
						<Tooltip
							content={
								systemAudioEnabled ? t("audio.disableSystemAudio") : t("audio.enableSystemAudio")
							}
						>
							<button
								className={`${styles.toggleButton} ${systemAudioEnabled ? styles.toggleButtonActive : ""}`}
								onClick={() => !recording && setSystemAudioEnabled(!systemAudioEnabled)}
								disabled={recording}
								aria-pressed={systemAudioEnabled}
							>
								{systemAudioEnabled
									? getIcon("volumeOn", styles.toggleIconActive)
									: getIcon("volumeOff", styles.toggleIcon)}
							</button>
						</Tooltip>
						<Tooltip
							content={
								microphoneEnabled ? t("audio.disableMicrophone") : t("audio.enableMicrophone")
							}
						>
							<button
								className={`${styles.toggleButton} ${microphoneEnabled ? styles.toggleButtonActive : ""}`}
								onClick={toggleMicrophone}
								disabled={recording}
								aria-pressed={microphoneEnabled}
							>
								{microphoneEnabled
									? getIcon("micOn", styles.toggleIconActive)
									: getIcon("micOff", styles.toggleIcon)}
							</button>
						</Tooltip>
						<Tooltip content={webcamEnabled ? t("webcam.disableWebcam") : t("webcam.enableWebcam")}>
							<button
								className={`${styles.toggleButton} ${webcamEnabled ? styles.toggleButtonActive : ""}`}
								onClick={async () => {
									await setWebcamEnabled(!webcamEnabled);
								}}
								aria-pressed={webcamEnabled}
							>
								{webcamEnabled
									? getIcon("webcamOn", styles.toggleIconActive)
									: getIcon("webcamOff", styles.toggleIcon)}
							</button>
						</Tooltip>
					</div>

					<button
						className={`${styles.recordButton} ${styles.electronNoDrag} ${recording ? styles.recordButtonActive : ""} ${
							!hasSelectedSource && !recording ? styles.recordButtonPending : ""
						}`}
						onClick={hasSelectedSource ? toggleRecording : openSourceSelector}
					>
						<span className={styles.recordIcon}>
							{recording
								? getIcon("stop", styles.recordIconActive)
								: getIcon(
										"record",
										hasSelectedSource ? styles.recordIconReady : styles.recordIconMuted,
									)}
						</span>
						<span className={styles.recordLabel}>{recordLabel}</span>
					</button>

					{recording && (
						<Tooltip content={t("tooltips.restartRecording")}>
							<button
								className={`${styles.utilityButton} ${styles.electronNoDrag}`}
								onClick={restartRecording}
							>
								{getIcon("restart", styles.utilityIcon)}
							</button>
						</Tooltip>
					)}

					<div className={styles.utilityRail}>
						<Tooltip content={t("tooltips.openVideoFile")}>
							<button
								className={`${styles.utilityButton} ${styles.electronNoDrag}`}
								onClick={openVideoFile}
								disabled={recording}
							>
								{getIcon("videoFile", styles.utilityIcon)}
							</button>
						</Tooltip>
						<Tooltip content={t("tooltips.openProject")}>
							<button
								className={`${styles.utilityButton} ${styles.electronNoDrag}`}
								onClick={openProjectFile}
								disabled={recording}
							>
								{getIcon("folder", styles.utilityIcon)}
							</button>
						</Tooltip>
						<div
							className={`${styles.localeRail} ${styles.electronNoDrag} ${isMac ? styles.localeRailMac : ""}`}
							title={t("language")}
						>
							<Languages size={12} className={styles.localeIcon} />
							<select
								value={locale}
								onChange={(e) => setLocale(e.target.value as Locale)}
								className={styles.localeSelect}
							>
								{SUPPORTED_LOCALES.map((loc) => (
									<option key={loc} value={loc}>
										{getLocaleName(loc)}
									</option>
								))}
							</select>
						</div>
						<div className={styles.windowRail}>
							<button
								className={`${styles.windowButton} ${styles.electronNoDrag}`}
								title={t("tooltips.hideHUD")}
								onClick={sendHudOverlayHide}
							>
								{getIcon("minimize", styles.windowIcon)}
							</button>
							<button
								className={`${styles.windowButton} ${styles.electronNoDrag}`}
								title={t("tooltips.closeApp")}
								onClick={sendHudOverlayClose}
							>
								{getIcon("close", styles.windowIcon)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
