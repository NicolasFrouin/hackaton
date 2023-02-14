const DEBUG_MODE = true;
const Hackaton = {
	poses: null,
	pose: null,
	keypoints: null,
	runner: null,
	tracker: null,
	state: {
		trackerOrEvents: [],
		hasGameStarted: false,
		hasTPosed: false,
		internalCounter: 0,
		isGameRunning: false,
		shoulderRefPoint: { x: null, y: null },
		jumpThreshold: null,
		crouchThreshold: null,
		lastAction: null,
	},
	/**
	 * Every possible actions to be performed with :
	 * - the test function (checks if player is able the perform the action)
	 * - the exec function (executes if test is successfull)
	 * - the stop function (executes to terminate the action)
	 * - the color of the threshold line on the canvas
	 */
	actions: [
		{ key: "jump", test: "isJumping", exec: "jump", stop: "stopJump" },
		{ key: "crouch", test: "isCrouching", exec: "crouch", stop: "stopCrouch" },
		// { key: "right", test: "isRighting", exec: "right", stop: "stopRight" },
		// { key: "left", test: "isLefting", exec: "left", stop: "stopLeft" },
	],
	conf: {
		minScore: 0.35,
		tPoseArmYOffset: 50,
		tPoseCounterLimit: 15,
		jumpThreshold: 50,
		crouchThreshold: 50,
		drawThresholdLines: true,
	},
	/**
	 * Gets the canvas or its context in which the tracker is rendered
	 * @param {boolean} getContext Do you want to get the canvas' 2d context ?
	 * @returns The canvas or its context
	 */
	getCanvasOrContext(getContext = false) {
		let canvas = document.getElementById("canvas");
		return getContext ? canvas.getContext("2d") : canvas;
	},
	/**
	 * Game loop function running every frame
	 * @param {object} poses Tracker's body poses
	 */
	runApp(poses) {
		this.runner = window["RunnerApp"];
		this.tracker = tracker;
		if (poses.length > 1) return;
		if (!poses?.[0]?.keypoints) return;
		this.poses = poses;
		this.pose = poses[0];
		this.keypoints = poses[0].keypoints;
		if (!this.state.hasGameStarted) return this.startGame();
		if (!this.state.isGameRunning) return;
		if (this.runner.crashed) {
			this.removeAllTrackerEventsHooks();
			this.state.hasGameStarted = false;
			this.state.isGameRunning = false;
			return debug("DEBUG : Game Over");
		}
		this.doActions();
	},
	/**
	 * Tests that the player is T-posing for n frames consecutive to avoid accidental starts
	 * @returns {boolean} Can the game be launched ?
	 */
	startGame() {
		// return this.init(); // bypass the T-posing test
		if (this.state.internalCounter > this.conf.tPoseCounterLimit) {
			this.state.internalCounter = 0;
			this.init();
			return true;
		}
		if (this.isTPosing()) this.state.internalCounter++;
		else this.state.internalCounter = 0;
		return false;
	},
	/**
	 * Initializes the app by setting the thresholds and starting the game
	 * @returns {boolean} Is the app initialized ?
	 */
	init() {
		let shoulderRef = this.setShoulderRef();
		this.setStateThreshold("jumpThreshold", shoulderRef, "y", "below");
		this.setStateThreshold("crouchThreshold", shoulderRef, "y", "above");
		this.state.hasGameStarted = true;
		this.state.isGameRunning = true;
		debug("___ GAME STARTED ___");
		this.runner.playIntro();
		this.jump(); // update the t-rex
		return true;
	},
	/**
	 * Gets the reference point to track body movments from
	 * @returns Object with x and y coordinates of the reference point
	 */
	getShoulderRef() {
		const [, , , , , l_shoulder, r_shoulder] = this.keypoints;
		return { x: Math.floor((l_shoulder.x + r_shoulder.x) / 2), y: Math.floor((l_shoulder.y + r_shoulder.y) / 2) };
	},
	/**
	 * Sets the reference point in the app state
	 * @returns The reference point
	 */
	setShoulderRef() {
		this.state.shoulderRefPoint = this.getShoulderRef();
		return this.state.shoulderRefPoint;
	},
	/**
	 * Sets a state's threshold from a reference point
	 *
	 * /!\ y axis is inverted : a point above an other will have a lower value
	 * @param {string} threshold Name of the state's threshold
	 * @param {object} refPoint The reference point
	 * @param {char} axis 'x' | 'y'
	 * @param {string} okState 'above' | 'below'
	 * @returns The updated state's threshold
	 */
	setStateThreshold(threshold, refPoint, axis, okState) {
		let thresholdValue =
			okState === "above" ? refPoint[axis] + this.conf[threshold] : refPoint[axis] - this.conf[threshold];
		this.state[threshold] = { axis, okState, value: thresholdValue };
		if (this.conf.drawThresholdLines) {
			const drawHook = () => {
				if (axis === "x") {
					this.drawLine(
						this.tracker.scaleX(thresholdValue),
						0,
						this.tracker.scaleX(thresholdValue),
						this.tracker.canvas.height
					);
				} else {
					this.drawLine(
						0,
						this.tracker.scaleY(thresholdValue),
						this.tracker.canvas.width,
						this.tracker.scaleY(thresholdValue)
					);
				}
			};
			this.state.trackerOrEvents.push({ event: "beforeupdate", hook: drawHook });
			this.tracker.on("beforeupdate", drawHook);
		}
		return this.state[threshold];
	},
	removeAllTrackerEventsHooks() {
		this.state.trackerOrEvents.forEach((el) => this.tracker.off(el.event, el.hook));
	},
	/**
	 * Checks for actions (1 max by frame) and stoping previous one if it is not the same.
	 * Allows to separate actions in start and end.
	 */
	doActions() {
		let actionCancelState = 0;
		for (const action of this.actions) {
			if (this[action.test]()) {
				debug("DEBUG : action :", action.key, "fired");
				actionCancelState++;
				if (action.key !== this.state.lastAction?.key) {
					if (this.state.lastAction) {
						this[this.state.lastAction.stop]();
						this.state.lastAction.cancelled = true;
					}
				}
				this[action.exec]();
				this.state.lastAction = { ...action, cancelled: false };
				break;
			}
		}
		if (this.state.lastAction) {
			if (actionCancelState == 0 && this.state.lastAction?.stop && this.state.lastAction.cancelled === false) {
				this[this.state.lastAction.stop]();
				this.state.lastAction.cancelled = true;
			}
		}
	},
	//#region Actions
	isJumping() {
		return this.getShoulderRef()[this.state.jumpThreshold.axis] < this.state.jumpThreshold.value;
	},
	jump() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.JUMP)[0];
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: jumpKeyCode }));
	},
	stopJump() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.JUMP)[0];
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: jumpKeyCode }));
	},
	isCrouching() {
		return this.getShoulderRef()[this.state.crouchThreshold.axis] > this.state.crouchThreshold.value;
	},
	crouch() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.DUCK)[0];
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: jumpKeyCode }));
	},
	stopCrouch() {
		let jumpKeyCode = Object.keys(this.runner.keycodes.DUCK)[0];
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: jumpKeyCode }));
	},
	//#endregion
	/**
	 * Checks if the player is T-posing
	 * @returns {boolean} Is the player T-posing ?
	 */
	isTPosing() {
		const [nose, , , , , l_shoulder, r_shoulder, l_elbow, r_elbow, l_wrist, r_wrist] = this.keypoints;
		const bothArms = [r_shoulder, r_elbow, r_wrist, l_shoulder, l_elbow, l_wrist];
		if (bothArms.some((kp) => !this.isAboveMinScore(kp))) return false;
		if (bothArms.some((kp) => kp.y < nose.y)) return false;
		if (l_shoulder.x > l_elbow.x || l_elbow.x > l_wrist.x) return false;
		if (r_shoulder.x < r_elbow.x || r_elbow.x < r_wrist.x) return false;
		if (!this.isArmFlat(r_shoulder, r_elbow, r_wrist) || !this.isArmFlat(l_shoulder, l_elbow, l_wrist))
			return false;
		this.state.hasTPosed = true;
		return true;
	},
	/**
	 * Compares the keypoint's score with the minimal score from the app conf
	 * @param {object} keypoint The keypoint to test
	 * @returns {boolean} Is the keypoint's score hight enough
	 */
	isAboveMinScore(keypoint) {
		return keypoint.score > this.conf.minScore;
	},
	/**
	 * Checks if the 3 points are roughly aligned
	 * @param {object} shoulder The shoulder object of the same arm
	 * @param {object} elbow The elbow object of the same arm
	 * @param {object} wrist The wrist object of the same arm
	 * @returns {boolean} Is arm flat ?
	 */
	isArmFlat(shoulder, elbow, wrist) {
		let { y: s } = shoulder;
		let { y: e } = elbow;
		let { y: w } = wrist;
		let yOff = this.conf.tPoseArmYOffset;
		return this.between(s, e - yOff, e + yOff) && this.between(e, w - yOff, w + yOff);
	},
	/**
	 * Evaluates if value is between min and max
	 * @param {number} value The value to evaluate
	 * @param {number} min The lower end
	 * @param {number} max The higher end
	 * @param {boolean} strict Is the comparaison strict ? ('<=' or '<')
	 * @returns {boolean} Is the value between min and max ?
	 */
	between(value, min, max, strict = false) {
		return strict ? min < value && value < max : min <= value && value <= max;
	},
	/**
	 * Draws a line on the canvas
	 * @param {number} fromX Starting point's width value
	 * @param {number} fromY Starting point's height value
	 * @param {number} toX Ending point's width value
	 * @param {number} toY Ending point's height value
	 * @param {string} color Line's color
	 */
	drawLine(fromX, fromY, toX, toY, color = "grey") {
		var ctx = this.getCanvasOrContext(true);
		ctx.lineWidth = 3;
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(fromX, fromY);
		ctx.lineTo(toX, toY);
		ctx.stroke();
		ctx.closePath();
	},
};

const debug = (...args) => DEBUG_MODE && console.log(...args);
