/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

const base = {
	white: '#fff',
	black: '#282A35',
	red: '#9E005D',
};

const grey = {
	grey_1: '#F2F5F8',
	grey_2: '#F2F3F5',
	grey_3: '#AEAFB3',
	grey_4: '#9BB9D1',
	grey_5: '#5E6068',
	grey_6: '#282A35',
	grey_highlight: '#DFDFE1',
};

const primary = {
	primary: '#113052',
	primary_dark: '#0A1F35',
	primary_darker: '#06131F',
	primary_light: '#1A4270',
	primary_lighter: '#265A97',
	primary_lightest: '#3373BF',
	primary_pale: '#DAE2EC',
	primary_palest: '#EDF1F5',
};

// Blue shades from the Secondary palette
const secondary = {
	secondary: '#0B75A2',
	secondary_dark: '#109ED9',
	secondary_light: '#4BC6F0',
	secondary_lighter: '#66CEF2',
	secondary_lightest: '#AEE5F8',
	secondary_pale: '#D2F1FB',
	secondary_palest: '#EDF9FD',

	// Legacy names for backward compatibility
	secondary_accessible: '#0B75A2', // Using the main secondary color
	secondary_1: '#AEE5F8', // Matching secondary_lightest
	secondary_2: '#4BC6F0', // Matching secondary_light
	secondary_black: '#282A35', // Using the black color
};

// Dark blue shades from the Accent 1 palette
const accent1 = {
	accent1_dark: '#00305D',
	accent1_medium: '#04518C',
	accent1_light: '#4F85AE',
	accent1_lighter: '#9BB9D1',
	accent1_lightest: '#C0D3E2',
	accent1_pale: '#E5EDF3',
};

// Purple/Pink shades from the Accent 2 palette
const accent2 = {
	accent2_dark: '#9E005D',
	accent2_medium: '#B74A89',
	accent2_light: '#C772A3',
	accent2_lighter: '#E2B7D0',
	accent2_lightest: '#EDD2E1',
	accent2_pale: '#F7ECF3',
};

// Yellow/Gold shades from the Accent 3 palette
const accent3 = {
	accent3_dark: '#CFD509',
	accent3_medium: '#D9DE3A',
	accent3_light: '#E4E775',
	accent3_lighter: '#F0F2B0',
	accent3_lightest: '#F5F7CE',
	accent3_pale: '#FBFBEB',
};

// Legacy accent properties for backward compatibility
const accent = {
	accent: '#0B75A2', // Using the main secondary color
	accent_dark: '#00305D', // Using accent1_dark
	accent_light: '#C0D3E2', // Using accent1_lightest
	accent_light_rgb: '192, 211, 226', // RGB version of accent1_lightest
	accent_1: '#E5EDF3', // Using accent1_pale
	accent_highlight: '#4F85AE40', // Semi-transparent version of accent1_light
};

// Grayscale colors
const grayscale = {
	grayscale_dark: '#282A35',
	grayscale_medium: '#5E6068',
	grayscale_light: '#AEAFB3',
	grayscale_lighter: '#DFDFE1',
	grayscale_lightest: '#F2F3F5',
	grayscale_pale: '#F2F5F8',
};

// Gradient colors
const gradients = {
	gradient_start: '#45A0D4',
	gradient_end: '#6EC9D0',
	gradient: 'linear-gradient(90deg, #45A0D4 0%, #6EC9D0 100%)',
};

// Success, error, warning states
const success = {
	success: '#00A88F',
	success_dark: '#00896F',
	success_light: '#E6F7F4',
};

const error = {
	error: '#9E005D',
	error_dark: '#7D0049',
	error_light: '#F7E6EF',

	// Legacy error names for backward compatibility
	error_1: '#F7E6EF', // Using error_light
	error_2: '#EDD2E1', // Using accent2_lightest
};

const warning = {
	warning: '#CFD509',
	warning_dark: '#A9AD07',
	warning_light: '#F9FAE6',

	// Legacy warning name for backward compatibility
	warning_1: '#F9FAE6', // Using warning_light
};

export default {
	...base,
	...grey,
	...grayscale,
	...primary,
	...secondary,
	...accent1,
	...accent2,
	...accent3,
	...accent, // Include legacy accent properties
	...gradients,
	...success,
	...error,
	...warning,
};

// Clean update for future

// const home = {
// 	hero: '#0B75A2',
// 	main: '#F2F5F8',
// 	button: '#00A88F',
// 	highlight: '#109ED9',
// };

// const base = {
// 	white: '#fff',
// 	black: '#282A35',
// 	red: '#9E005D',
// };

// const grey = {
// 	grey_1: '#F2F5F8',
// 	grey_2: '#F2F3F5',
// 	grey_3: '#AEAFB3',
// 	grey_4: '#9BB9D1',
// 	grey_5: '#5E6068',
// 	grey_6: '#282A35',
// 	grey_highlight: '#DFDFE1',
// };

// // Teal/Green shades from the Primary palette
// const primary = {
// 	primary: '#00A88F',
// 	primary_dark: '#00C4A7',
// 	primary_light: '#00DDBE',
// 	primary_lighter: '#40E6CF',
// 	primary_lightest: '#99F1E5',
// 	primary_pale: '#CCF8F2',
// 	primary_palest: '#E5FBF8',
// };

// // Blue shades from the Secondary palette
// const secondary = {
// 	secondary: '#0B75A2',
// 	secondary_dark: '#109ED9',
// 	secondary_light: '#4BC6F0',
// 	secondary_lighter: '#66CEF2',
// 	secondary_lightest: '#AEE5F8',
// 	secondary_pale: '#D2F1FB',
// 	secondary_palest: '#EDF9FD',
// };

// // Dark blue shades from the Accent 1 palette
// const accent1 = {
// 	accent1_dark: '#00305D',
// 	accent1_medium: '#04518C',
// 	accent1_light: '#4F85AE',
// 	accent1_lighter: '#9BB9D1',
// 	accent1_lightest: '#C0D3E2',
// 	accent1_pale: '#E5EDF3',
// };

// // Purple/Pink shades from the Accent 2 palette
// const accent2 = {
// 	accent2_dark: '#9E005D',
// 	accent2_medium: '#B74A89',
// 	accent2_light: '#C772A3',
// 	accent2_lighter: '#E2B7D0',
// 	accent2_lightest: '#EDD2E1',
// 	accent2_pale: '#F7ECF3',
// };

// // Yellow/Gold shades from the Accent 3 palette
// const accent3 = {
// 	accent3_dark: '#CFD509',
// 	accent3_medium: '#D9DE3A',
// 	accent3_light: '#E4E775',
// 	accent3_lighter: '#F0F2B0',
// 	accent3_lightest: '#F5F7CE',
// 	accent3_pale: '#FBFBEB',
// };

// // Grayscale colors
// const grayscale = {
// 	grayscale_dark: '#282A35',
// 	grayscale_medium: '#5E6068',
// 	grayscale_light: '#AEAFB3',
// 	grayscale_lighter: '#DFDFE1',
// 	grayscale_lightest: '#F2F3F5',
// 	grayscale_pale: '#F2F5F8',
// };

// // Gradient colors
// const gradients = {
// 	gradient_start: '#45A0D4',
// 	gradient_end: '#6EC9D0',
// 	gradient: 'linear-gradient(90deg, #45A0D4 0%, #6EC9D0 100%)',
// };

// // Success, error, warning states
// const success = {
// 	success: '#00A88F',
// 	success_dark: '#00896F',
// 	success_light: '#E6F7F4',
// };

// const error = {
// 	error: '#9E005D',
// 	error_dark: '#7D0049',
// 	error_light: '#F7E6EF',
// };

// const warning = {
// 	warning: '#CFD509',
// 	warning_dark: '#A9AD07',
// 	warning_light: '#F9FAE6',
// };

// export default {
// 	...base,
// 	...grey,
// 	...grayscale,
// 	...primary,
// 	...secondary,
// 	...accent1,
// 	...accent2,
// 	...accent3,
// 	...gradients,
// 	...success,
// 	...error,
// 	...warning,
// 	...home,
// };
