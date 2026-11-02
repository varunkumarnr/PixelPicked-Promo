import React from "react";
import { Composition } from "remotion";
import { FPS } from "./config";
import { FULL_CUT, SHORT_CUT } from "./timeline";
import { Wall } from "./Wall";
import { Wallpaper } from "./Wallpaper";
import { XHeader } from "./XHeader";
import { WallpaperTE } from "./WallpaperTE";
import { WallpaperSpace } from "./WallpaperSpace";
import { WallpaperSpace3D } from "./WallpaperSpace3D";
import { WallpaperGallery } from "./WallpaperGallery";
import { WallpaperLetters } from "./WallpaperLetters";
import { DevlogsGraphic } from "./DevlogsGraphic";
import { HistoryMontage, HISTORY_MONTAGE_DURATION } from "./HistoryMontage";
import { HistoryFull, HISTORY_FULL_DURATION } from "./HistoryFull";
import { DevCallGraphic } from "./DevCallGraphic";
import { YouTubeThumb } from "./YouTubeThumb";
import { DevBeforeAfter, DEV_BEFORE_AFTER_DURATION } from "./DevBeforeAfter";
import { SiblingsLookTest } from "./siblings/LookTest";
import { FOUNDER_TRIAL_DURATION, FounderConcept, FounderTrial } from "./founder/Trial";
import { CourtFrame } from "./founder/Court";
import { COURT_REEL_DURATION, CourtReel } from "./founder/CourtReel";
import { TANK_REEL_DURATION, TankReel } from "./founder/TankReel";
import { Episode2, EPISODE2_DURATION } from "./siblings/Episode2";
import { EPISODE3_DURATION, Episode3 } from "./siblings/Episode3";
import { CORTISOL_DURATION, Cortisol } from "./meme/Cortisol";
import { GAME_FOR_THAT_DURATION, GameForThat, GameForThatWide } from "./ad/GameForThat";

export const Root: React.FC = () => (
  <>
    {/* YouTube, X, the website */}
    <Composition id="Wall" component={Wall} durationInFrames={FULL_CUT.DURATION} fps={FPS} width={1920} height={1080} />
    {/* Reels, TikTok, Shorts */}
    <Composition id="WallVertical" component={Wall} durationInFrames={FULL_CUT.DURATION} fps={FPS} width={1080} height={1920} />
    {/* Short vertical cut for Reels and Shorts: Keith and Kieran, tighter pacing. */}
    <Composition id="WallVerticalShort" component={Wall} defaultProps={{ cut: "short" as const }} durationInFrames={SHORT_CUT.DURATION} fps={FPS} width={1080} height={1920} />
    {/* Wallpapers (stills): 4K desktop and phone */}
    <Composition id="WallpaperDesktop" component={Wallpaper} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperPhone" component={Wallpaper} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Find-the-game challenge: every game once, full brightness, no logo */}
    <Composition id="WallpaperFindDesktop" component={Wallpaper} defaultProps={{ plain: true }} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperFindPhone" component={Wallpaper} defaultProps={{ plain: true }} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Teenage Engineering-style wallpapers */}
    <Composition id="WallpaperTEDesktop" component={WallpaperTE} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperTEPhone" component={WallpaperTE} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Relativity: PixelPicked bending spacetime, every game in orbit */}
    <Composition id="WallpaperSpaceDesktop" component={WallpaperSpace} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperSpacePhone" component={WallpaperSpace} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* The same idea as a real 3D scene */}
    <Composition id="WallpaperSpace3DDesktop" component={WallpaperSpace3D} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperSpace3DPhone" component={WallpaperSpace3D} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Gallery wall: every game framed, PixelPicked in the middle */}
    <Composition id="WallpaperGalleryDesktop" component={WallpaperGallery} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperGalleryPhone" component={WallpaperGallery} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Framed games hung to spell PIXEL PICKED */}
    <Composition id="WallpaperLettersDesktop" component={WallpaperLetters} durationInFrames={1} fps={FPS} width={3840} height={2160} />
    <Composition id="WallpaperLettersPhone" component={WallpaperLetters} durationInFrames={1} fps={FPS} width={1290} height={2796} />
    {/* Social graphic: 500+ devlogs */}
    {/* X profile header: 1500x500 at 2x */}
    <Composition id="XHeader" component={XHeader} durationInFrames={1} fps={FPS} width={3000} height={1000} />

    <Composition id="DevlogsGraphic" component={DevlogsGraphic} durationInFrames={1} fps={FPS} width={1080} height={1080} />
    {/* Reel: what your most-played mobile game says about you */}
    {/* Reel: pick rates your excuses for losing */}
    <Composition id="DevBeforeAfter" component={DevBeforeAfter} durationInFrames={DEV_BEFORE_AFTER_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="YouTubeThumb" component={YouTubeThumb} durationInFrames={1} fps={FPS} width={1920} height={1080} />
    <Composition id="DevCallGraphic" component={DevCallGraphic} durationInFrames={1} fps={FPS} width={2000} height={1125} />
    <Composition id="HistoryVertical" component={HistoryFull} durationInFrames={HISTORY_FULL_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="HistoryMontage" component={HistoryMontage} durationInFrames={HISTORY_MONTAGE_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="SiblingsEp2" component={Episode2} durationInFrames={EPISODE2_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="SiblingsEp2Anime" component={Episode2} durationInFrames={EPISODE2_DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ look: "anime" as const }} />
    <Composition id="SiblingsEp3" component={Episode3} durationInFrames={EPISODE3_DURATION} fps={FPS} width={1080} height={1920} />
    {/* the YouTube Shorts cut: subtitles clear of the Shorts title bar */}
    <Composition id="SiblingsEp3Shorts" component={Episode3} durationInFrames={EPISODE3_DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ shorts: true }} />
    {/* Ad: "We've got a game for that." Captions sit in the upper third, so one vertical cut serves Reels and Shorts */}
    <Composition id="GameForThat" component={GameForThat} durationInFrames={GAME_FOR_THAT_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="Cortisol" component={Cortisol} durationInFrames={CORTISOL_DURATION} fps={FPS} width={1080} height={1920} />
    <Composition id="GameForThatWide" component={GameForThatWide} durationInFrames={GAME_FOR_THAT_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="SiblingsLookTest" component={SiblingsLookTest} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ shot: "wide" as const }} />
    <Composition id="FounderTrial" component={FounderTrial} durationInFrames={FOUNDER_TRIAL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="FounderTrialYT" component={FounderTrial} defaultProps={{ platform: "youtube" as const }} durationInFrames={FOUNDER_TRIAL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="CourtReel" component={CourtReel} durationInFrames={COURT_REEL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="CourtReelYT" component={CourtReel} defaultProps={{ platform: "youtube" as const }} durationInFrames={COURT_REEL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="TankReel" component={TankReel} durationInFrames={TANK_REEL_DURATION} fps={30} width={1080} height={1920} />
    <Composition id="CourtFrame" component={CourtFrame} defaultProps={{ shot: 0 }} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="FounderConcept" component={FounderConcept} defaultProps={{ style: { post: "film" as const, tall: false }, at: 60 }} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
