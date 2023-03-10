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
		currentDifficulty: 100,
		thresholds: {},
		scoreHistory: [],
		position: "center",
	},
	/**
	 * Every possible actions to be performed with :
	 * - the test function (checks if player is able the perform the action)
	 * - the exec function (executes if test is successfull)
	 * - the stop function (executes to terminate the action)
	 * - the axis to check is the test
	 * - the state to compare the axis on
	 * - the color of the line
	 */
	actions: [
		{
			key: "jump",
			test: "isJumping",
			exec: "jump",
			stop: "stopJump",
			axis: "y",
			okState: "below",
			color: "red",
		},
		{
			key: "crouch",
			test: "isCrouching",
			exec: "crouch",
			stop: "stopCrouch",
			axis: "y",
			okState: "above",
			color: "red",
		},
		{
			key: "left",
			test: "isGoingLeft",
			exec: "goLeft",
			stop: "stopGoingLeft",
			axis: "x",
			okState: "below",
			color: "blue",
		},
		{
			key: "right",
			test: "isGoingRight",
			exec: "goRight",
			stop: "stopGoingRight",
			axis: "x",
			okState: "above",
			color: "blue",
		},
		{
			key: "center",
			test: "isGoingCenter",
			exec: "goCenter",
			stop: "stopGoingCenter",
			axis: "",
			okState: "",
			color: "",
		},
	],
	conf: {
		minScore: 0.35,
		tPoseArmYOffset: 50,
		tPoseCounterLimit: 15,
		jumpThreshold: 150,
		crouchThreshold: 150,
		drawThresholdLines: true,
		difficultyStep: 25,
		easyDifficulty: 50,
		normalDifficulty: 100,
		hardDifficulty: 150,
		keycodes: {
			up: 38, // ArrowUp
			down: 40, // ArrowDown
			left: 65, // a
			right: 69, // e
			center: 90, // z
		},
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
			this.saveScore();
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
		this.difficultyDraw();
		if (this.isTPosing()) this.state.internalCounter++;
		else this.state.internalCounter = 0;
		return false;
	},
	/**
	 * Initializes the app by setting the thresholds and starting the game
	 * @returns {boolean} Is the app initialized ?
	 */
	init() {
		this.removeAllTrackerEventsHooks();
		this.setShoulderRef();
		this.setStateThreshold();
		this.state.hasGameStarted = true;
		this.state.isGameRunning = true;
		debug("___ GAME STARTED ___");
		this.runner.playIntro();
		this.jump(); // update the t-rex
		return true;
	},
	saveScore() {
		console.log(this.runner.distanceMeter.getActualDistance(this.runner.distanceRan));
		this.state.scoreHistory.push({
			difficulty: this.state.currentDifficulty,
			score: this.runner.distanceMeter.getActualDistance(this.runner.distanceRan),
		});
	},
	resetHistory() {
		this.state.scoreHistory = [];
	},
	difficultyDraw() {
		let refPoint = this.getShoulderRef();
		if (
			!this.between(refPoint.x, 0, this.tracker.video.width) ||
			!this.between(refPoint.y, 0, this.tracker.video.height)
		)
			return false;
		for (const action of this.actions) {
			if (!action.okState) continue;
			let thresholdValue =
				action.okState === "above"
					? refPoint[action.axis] + this.state.currentDifficulty
					: refPoint[action.axis] - this.state.currentDifficulty;
			if (action.axis === "x") {
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
		}
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
	 * Sets state's thresholds and draws them
	 *
	 * /!\ y axis is inverted : a point above an other will have a lower value
	 */
	setStateThreshold() {
		let refPoint = this.state.shoulderRefPoint;
		for (const action of this.actions) {
			if (!action.okState) continue;
			let thresholdValue =
				action.okState === "above"
					? refPoint[action.axis] + this.state.currentDifficulty
					: refPoint[action.axis] - this.state.currentDifficulty;
			const drawHook = () => {
				if (action.axis === "x") {
					this.drawLine(
						this.tracker.scaleX(thresholdValue),
						0,
						this.tracker.scaleX(thresholdValue),
						this.tracker.canvas.height,
						action.color
					);
				} else {
					this.drawLine(
						0,
						this.tracker.scaleY(thresholdValue),
						this.tracker.canvas.width,
						this.tracker.scaleY(thresholdValue),
						action.color
					);
				}
			};
			this.state.thresholds[action.key] = thresholdValue;
			this.state.trackerOrEvents.push({ event: "beforeupdate", hook: drawHook });
			this.tracker.on("beforeupdate", drawHook);
		}
	},
	removeAllTrackerEventsHooks() {
		this.state.trackerOrEvents.forEach((el) => this.tracker.off(el.event, el.hook));
		this.state.trackerOrEvents = [];
	},
	/**
	 * Checks for actions (1 max by frame) and stoping previous one if it is not the same.
	 * Allows to separate actions in start and end.
	 */
	doActions() {
		let actionCancelState = 0;
		const refPoint = this.getShoulderRef();
		for (const action of this.actions) {
			if (this[action.test](refPoint)) {
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
	isJumping(refPoint) {
		return refPoint.y < this.state.thresholds["jump"];
	},
	jump() {
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: this.conf.keycodes.up }));
	},
	stopJump() {
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: this.conf.keycodes.up }));
	},
	isCrouching(refPoint) {
		return refPoint.y > this.state.thresholds["crouch"];
	},
	crouch() {
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: this.conf.keycodes.down }));
	},
	stopCrouch() {
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: this.conf.keycodes.down }));
	},
	isGoingLeft(refPoint) {
		return this.state.position !== "left" && refPoint.x < this.state.thresholds["left"];
	},
	goLeft() {
		this.state.position = "left";
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: this.conf.keycodes.left }));
	},
	stopGoingLeft() {
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: this.conf.keycodes.left }));
	},
	isGoingRight(refPoint) {
		return this.state.position !== "right" && refPoint.x > this.state.thresholds["right"];
	},
	goRight() {
		this.state.position = "right";
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: this.conf.keycodes.right }));
	},
	stopGoingRight() {
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: this.conf.keycodes.right }));
	},
	isGoingCenter(refPoint) {
		return (
			this.state.position !== "center" &&
			between(refPoint.x, this.state.thresholds["left"], this.state.thresholds["right"])
		);
	},
	goCenter() {
		this.state.position = "center";
		document.dispatchEvent(new KeyboardEvent("keydown", { keyCode: this.conf.keycodes.center }));
	},
	stopGoingCenter() {
		document.dispatchEvent(new KeyboardEvent("keyup", { keyCode: this.conf.keycodes.center }));
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

$(() => {
	var myChart;
	$("#diffScore").text(Hackaton.conf.normalDifficulty);
	$("#disable-camera").click(function () {
		that = $(this);
		that.toggleClass("disabled");
		if (that.hasClass("disabled")) {
			that.text("Cam??ra d??sactiv??e");
			Hackaton.tracker.video.srcObject.getTracks().forEach((t) => t.stop());
		} else {
			that.text("Cam??ra activ??e");
			Hackaton.tracker.initCamera();
		}
	});
	$("#btnDiffEasy").click(() => (Hackaton.state.currentDifficulty = Hackaton.conf.easyDifficulty));
	$("#btnDiffNormal").click(() => (Hackaton.state.currentDifficulty = Hackaton.conf.normalDifficulty));
	$("#btnDiffHard").click(() => (Hackaton.state.currentDifficulty = Hackaton.conf.hardDifficulty));
	$("#btnDiffAdd").click(() => {
		if (Hackaton.state.currentDifficulty < Hackaton.tracker.video.height / 2)
			Hackaton.state.currentDifficulty += Hackaton.conf.difficultyStep;
	});
	$("#btnDiffLess").click(() => {
		if (Hackaton.state.currentDifficulty > Hackaton.conf.difficultyStep)
			Hackaton.state.currentDifficulty -= Hackaton.conf.difficultyStep;
	});
	$("#btnDiffEasy, #btnDiffNormal, #btnDiffHard, #btnDiffAdd, #btnDiffLess").click(() =>
		$("#diffScore").text(Hackaton.state.currentDifficulty)
	);
	$("#btnResetLeaderboard").click(() => Hackaton.resetHistory());
	$("#btnLeaderboard").click(() => {
		const leaderboardContainer = $("#canvasLeaderboardContainer");
		leaderboardContainer.toggleClass("opened");
		if (leaderboardContainer.hasClass("opened")) {
			leaderboardContainer.append('<canvas id="canvasLeaderboard"></canvas>');
			myChart = new Chart($("#canvasLeaderboard"), {
				type: "line",
				data: {
					labels: Hackaton.state.scoreHistory.map((s) => s.difficulty),
					datasets: [
						{
							label: "??volution des scores",
							data: Hackaton.state.scoreHistory.map((s) => s.score),
							borderWidth: 1,
						},
					],
				},
				options: { scales: { y: { beginAtZero: true } } },
			});
		} else {
			$("#canvasLeaderboard").remove();
		}
	});
});

/*
leaderboard avec chart {
	score + difficult??
}

*/
