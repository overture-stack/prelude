/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
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

import { css } from '@emotion/react';
import {
	DictionaryStaticDataProvider,
	DictionaryTableStateProvider,
	DictionaryTableViewer,
	ThemeProvider,
	useDictionaryTableState,
} from '@overture-stack/lectern-ui';
// @ts-ignore - Dictionary is both the Zod schema and the type; ts-ignore needed for the Zod runtime value
import { Dictionary } from '@overture-stack/lectern-dictionary';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import ReactCodeMirror from '@uiw/react-codemirror';
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';

const SPLIT_MIN = 20; // % — minimum width for either panel
const SPLIT_MAX = 80;
import { createLecternTheme } from '../../theme/adapters/lectern';
import { useStageTheme } from './hooks';

const STARTER_TEMPLATE = JSON.stringify(
	{
		name: 'my-dictionary',
		version: '1.0',
		schemas: [
			{
				name: 'donor',
				description: 'Core donor record',
				fields: [
					{
						name: 'donor_id',
						valueType: 'string',
						description: 'Unique identifier for the donor',
						restrictions: { required: true, regex: '^DO-[0-9]{3,}$' },
					},
					{
						name: 'sex',
						valueType: 'string',
						description: 'Biological sex of the donor',
						restrictions: { required: true, codeList: ['Female', 'Male', 'Other', 'Unknown'] },
					},
					{
						name: 'age_at_diagnosis',
						valueType: 'integer',
						description: 'Age in years at time of primary diagnosis',
						restrictions: { range: { min: 0, max: 120 } },
					},
					{
						name: 'primary_diagnosis',
						valueType: 'string',
						description: 'Primary disease or condition',
						restrictions: { required: true },
					},
				],
			},
		],
	},
	null,
	2,
);

const DEMO_TEMPLATE = JSON.stringify(
	{
		name: 'pcgl_demo_dictionary',
		description:
			'Simplified PCGL data dictionary demonstrating core Lectern features: references, foreign keys, conditional logic, arrays, and code lists.',
		version: '1.0',
		references: {
			regex: {
				id_format: '^[A-Za-z0-9\\-\\._]{1,64}$',
				date_format: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$',
				mondo_code: '^MONDO:\\d{7}$',
				hgnc_gene: '^HGNC:\\d+$',
			},
			list: {
				missing_values: ['Not applicable', 'Unknown', 'Not collected', 'Not provided', 'Restricted access'],
				sex_at_birth: ['Male', 'Female', 'Intersex', 'Unknown', 'Not collected'],
			},
		},
		schemas: [
			{
				name: 'participant',
				description:
					'Core entity representing an individual enrolled in a PCGL study. Every other schema links back to this record via foreign key.',
				meta: {
					category: 'Clinical',
				},
				fields: [
					{
						name: 'submitter_participant_id',
						description: 'Unique identifier for the participant, assigned by the data submitter.',
						valueType: 'string',
						unique: true,
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Participant ID',
							examples: ['PCGL-001', 'BLD_donor_89', 'AML-90'],
						},
					},
					{
						name: 'study_id',
						description: 'Identifier of the study this participant belongs to.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Study ID',
							examples: ['PCGL-STUDY-001'],
						},
					},
					{
						name: 'sex_at_birth',
						description: 'The biological sex assigned to the participant at birth.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: '#/list/sex_at_birth',
						},
						meta: {
							displayName: 'Sex at Birth',
						},
					},
					{
						name: 'age_at_enrolment',
						description: 'Age of the participant in years at the time of study enrolment.',
						valueType: 'integer',
						restrictions: {
							required: true,
							range: {
								min: 0,
								max: 130,
							},
						},
						meta: {
							displayName: 'Age at Enrolment',
						},
					},
					{
						name: 'duo_permission',
						description: "Data Use Ontology (DUO) code specifying the permitted use of this participant's data.",
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: [
								'DUO:0000004 (no restriction)',
								'DUO:0000006 (health or medical or biomedical research)',
								'DUO:0000007 (disease specific research)',
								'DUO:0000042 (general research use)',
							],
						},
						meta: {
							displayName: 'DUO Permission',
						},
					},
					{
						name: 'disease_specific_modifier',
						description:
							"Required when duo_permission is 'disease specific research'. Provide one or more MONDO ontology codes specifying the applicable disease(s).",
						valueType: 'string',
						isArray: true,
						delimiter: '|',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['duo_permission'],
										match: {
											value: 'DUO:0000007 (disease specific research)',
										},
									},
								],
							},
							then: {
								required: true,
								regex: '#/regex/mondo_code',
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Disease Specific Modifier',
							examples: ['MONDO:0004992', 'MONDO:0005070'],
						},
					},
					{
						name: 'vital_status',
						description: 'Last known vital status of the participant.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: ['Alive', 'Deceased', 'Unknown', 'Not collected'],
						},
						meta: {
							displayName: 'Vital Status',
						},
					},
					{
						name: 'date_of_death',
						description:
							"Date of death in ISO-8601 format (YYYY-MM-DD). Required only when vital_status is 'Deceased'.",
						valueType: 'string',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['vital_status'],
										match: {
											value: 'Deceased',
										},
									},
								],
							},
							then: {
								required: true,
								regex: '#/regex/date_format',
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Date of Death',
							examples: ['2023-04-15'],
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_participant_id'],
				},
			},
			{
				name: 'diagnosis',
				description:
					'Primary cancer diagnosis for a participant. Each diagnosis record is linked to a single participant and may have one or more associated treatment records.',
				meta: {
					category: 'Clinical',
				},
				fields: [
					{
						name: 'submitter_diagnosis_id',
						description: 'Unique identifier for this diagnosis record, assigned by the data submitter.',
						valueType: 'string',
						unique: true,
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Diagnosis ID',
							examples: ['DIAG-001', 'AML-DIAG-42'],
						},
					},
					{
						name: 'submitter_participant_id',
						description: 'Reference to the participant this diagnosis belongs to.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Participant ID',
						},
					},
					{
						name: 'cancer_type_code',
						description: 'ICD-O-3 topography code for the primary tumour site.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '^C[0-9]{2}(\\.[0-9])?$',
						},
						meta: {
							displayName: 'Cancer Type (ICD-O-3)',
							examples: ['C50.1', 'C34.9', 'C61'],
						},
					},
					{
						name: 'stage_group',
						description: 'Overall stage of the cancer at time of diagnosis.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: [
								'Stage I',
								'Stage II',
								'Stage III',
								'Stage IV',
								'Occult',
								'Cannot be assessed',
								'Not applicable',
								'Unknown',
								'Not collected',
							],
						},
						meta: {
							displayName: 'Stage Group',
						},
					},
					{
						name: 'staging_system',
						description:
							'Staging system used to classify the tumour. Required when stage_group is a numbered stage (I–IV).',
						valueType: 'string',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['stage_group'],
										match: {
											codeList: ['Stage I', 'Stage II', 'Stage III', 'Stage IV'],
										},
									},
								],
							},
							then: {
								required: true,
								codeList: [
									'AJCC 8th Edition',
									'AJCC 7th Edition',
									'FIGO',
									'Ann Arbor',
									'Lugano',
									'Binet',
									'Rai',
									'Other',
								],
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Staging System',
						},
					},
					{
						name: 'date_of_diagnosis',
						description: 'Date the cancer diagnosis was confirmed (YYYY-MM-DD).',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/date_format',
						},
						meta: {
							displayName: 'Date of Diagnosis',
							examples: ['2021-03-10'],
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_diagnosis_id'],
					foreignKey: [
						{
							schema: 'participant',
							mappings: [
								{
									local: 'submitter_participant_id',
									foreign: 'submitter_participant_id',
								},
							],
						},
					],
				},
			},
			{
				name: 'treatment',
				description:
					'Cancer treatment administered to a participant as part of a specific diagnosis. Supports multiple foreign keys linking to both the participant and diagnosis.',
				meta: {
					category: 'Clinical',
				},
				fields: [
					{
						name: 'submitter_treatment_id',
						description: 'Unique identifier for this treatment record.',
						valueType: 'string',
						unique: true,
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Treatment ID',
							examples: ['TX-001', 'CHEMO-AML-01'],
						},
					},
					{
						name: 'submitter_participant_id',
						description: 'Reference to the participant receiving this treatment.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Participant ID',
						},
					},
					{
						name: 'submitter_diagnosis_id',
						description: 'Reference to the diagnosis this treatment addresses.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Diagnosis ID',
						},
					},
					{
						name: 'treatment_type',
						description: 'The primary modality of treatment administered.',
						valueType: 'string',
						isArray: true,
						delimiter: '|',
						restrictions: {
							required: true,
							codeList: [
								'Chemotherapy',
								'Immunotherapy',
								'Targeted Therapy',
								'Hormone Therapy',
								'Radiation Therapy',
								'Surgery',
								'Stem Cell Transplant',
								'Bone Marrow Transplant',
								'No treatment',
								'Other',
							],
						},
						meta: {
							displayName: 'Treatment Type',
						},
					},
					{
						name: 'drug_name',
						description: 'Name(s) of the drug(s) administered. Required when treatment includes a systemic therapy.',
						valueType: 'string',
						isArray: true,
						delimiter: '|',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['treatment_type'],
										match: {
											codeList: ['Chemotherapy', 'Immunotherapy', 'Targeted Therapy', 'Hormone Therapy'],
										},
										arrayFieldCase: 'any',
									},
								],
							},
							then: {
								required: true,
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Drug Name',
							examples: ['Imatinib', 'Pembrolizumab', 'Tamoxifen'],
						},
					},
					{
						name: 'treatment_start_date',
						description: 'Date treatment was initiated (YYYY-MM-DD).',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/date_format',
						},
						meta: {
							displayName: 'Treatment Start Date',
							examples: ['2021-06-01'],
						},
					},
					{
						name: 'treatment_end_date',
						description: 'Date treatment was completed or stopped (YYYY-MM-DD).',
						valueType: 'string',
						restrictions: {
							regex: '#/regex/date_format',
						},
						meta: {
							displayName: 'Treatment End Date',
							examples: ['2021-12-15'],
						},
					},
					{
						name: 'treatment_response',
						description: 'Best overall response observed during the course of treatment.',
						valueType: 'string',
						restrictions: {
							codeList: [
								'Complete Response',
								'Partial Response',
								'Stable Disease',
								'Progressive Disease',
								'Not Assessed',
								'Unknown',
								'Not applicable',
							],
						},
						meta: {
							displayName: 'Treatment Response',
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_treatment_id'],
					foreignKey: [
						{
							schema: 'participant',
							mappings: [
								{
									local: 'submitter_participant_id',
									foreign: 'submitter_participant_id',
								},
							],
						},
						{
							schema: 'diagnosis',
							mappings: [
								{
									local: 'submitter_diagnosis_id',
									foreign: 'submitter_diagnosis_id',
								},
							],
						},
					],
				},
			},
			{
				name: 'biospecimen',
				description:
					'Biological sample collected from a participant. Each biospecimen is linked to a participant and can be associated with one or more genomic files.',
				meta: {
					category: 'Biospecimen',
				},
				fields: [
					{
						name: 'submitter_biospecimen_id',
						description: 'Unique identifier for the biospecimen, assigned by the data submitter.',
						valueType: 'string',
						unique: true,
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Biospecimen ID',
							examples: ['BS-001', 'BLOOD-AML-042'],
						},
					},
					{
						name: 'submitter_participant_id',
						description: 'Reference to the participant this biospecimen was collected from.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Participant ID',
						},
					},
					{
						name: 'specimen_type',
						description: 'The type of biological material collected.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: [
								'Primary Tumour',
								'Recurrent Tumour',
								'Metastatic Tumour',
								'Normal - Solid Tissue',
								'Normal - Blood',
								'Normal - Bone Marrow',
								'Normal - Skin',
								'Cell Line',
								'Xenograft',
								'Other',
							],
						},
						meta: {
							displayName: 'Specimen Type',
						},
					},
					{
						name: 'collection_date',
						description: 'Date the biospecimen was collected (YYYY-MM-DD).',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/date_format',
						},
						meta: {
							displayName: 'Collection Date',
							examples: ['2021-04-22'],
						},
					},
					{
						name: 'biobank_accession',
						description: 'External accession number from the biobank registry where this sample is stored.',
						valueType: 'string',
						restrictions: {
							regex: '^SAMN\\d{8}$',
						},
						meta: {
							displayName: 'Biobank Accession',
							examples: ['SAMN12345678'],
						},
					},
					{
						name: 'tissue_source',
						description: 'Anatomical source of the tissue.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: [
								'Blood',
								'Bone Marrow',
								'Breast',
								'Colorectal',
								'Kidney',
								'Liver',
								'Lung',
								'Lymph Node',
								'Ovary',
								'Prostate',
								'Skin',
								'Other',
							],
						},
						meta: {
							displayName: 'Tissue Source',
						},
					},
					{
						name: 'pathological_tumour_content',
						description:
							'Estimated percentage of tumour cells in the sample (0–100%). Only applicable for tumour specimens.',
						valueType: 'number',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['specimen_type'],
										match: {
											codeList: ['Primary Tumour', 'Recurrent Tumour', 'Metastatic Tumour'],
										},
									},
								],
							},
							then: {
								required: true,
								range: {
									min: 0,
									max: 100,
								},
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Pathological Tumour Content (%)',
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_biospecimen_id'],
					foreignKey: [
						{
							schema: 'participant',
							mappings: [
								{
									local: 'submitter_participant_id',
									foreign: 'submitter_participant_id',
								},
							],
						},
					],
				},
			},
			{
				name: 'genomic_file',
				description:
					'Sequencing file derived from a biospecimen. Stores metadata for submitted genomic data files. Uses a compound unique key across biospecimen and file name.',
				meta: {
					category: 'Genomics',
				},
				fields: [
					{
						name: 'submitter_biospecimen_id',
						description: 'Reference to the biospecimen this file was derived from.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Biospecimen ID',
						},
					},
					{
						name: 'file_name',
						description: 'Name of the submitted genomic file.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '^[A-Za-z0-9\\-\\._]+\\.(bam|cram|fastq\\.gz|vcf\\.gz|bcf)$',
						},
						meta: {
							displayName: 'File Name',
							examples: ['sample_001.bam', 'variants_final.vcf.gz'],
						},
					},
					{
						name: 'file_format',
						description: 'Format of the submitted genomic data file.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: ['BAM', 'CRAM', 'FASTQ', 'VCF', 'BCF', 'MAF', 'TSV'],
						},
						meta: {
							displayName: 'File Format',
						},
					},
					{
						name: 'sequencing_strategy',
						description: 'Library strategy used to generate the sequencing data.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: ['WGS', 'WES', 'RNA-Seq', 'Targeted Panel', 'Bisulfite-Seq', 'ATAC-Seq', 'ChIP-Seq', 'Other'],
						},
						meta: {
							displayName: 'Sequencing Strategy',
						},
					},
					{
						name: 'read_length',
						description: 'Read length (in base pairs) used during sequencing.',
						valueType: 'integer',
						restrictions: {
							range: {
								min: 35,
								max: 1000,
							},
						},
						meta: {
							displayName: 'Read Length (bp)',
						},
					},
					{
						name: 'reference_genome',
						description: 'Reference genome assembly used for alignment.',
						valueType: 'string',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['file_format'],
										match: {
											codeList: ['BAM', 'CRAM', 'VCF', 'BCF'],
										},
									},
								],
							},
							then: {
								required: true,
								codeList: ['GRCh38', 'GRCh37', 'hg19', 'hg38', 'T2T-CHM13v2.0'],
							},
						},
						meta: {
							displayName: 'Reference Genome',
						},
					},
					{
						name: 'gene_targets',
						description:
							'HGNC identifiers for genes targeted by a panel. Only applicable for Targeted Panel sequencing.',
						valueType: 'string',
						isArray: true,
						delimiter: '|',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['sequencing_strategy'],
										match: {
											value: 'Targeted Panel',
										},
									},
								],
							},
							then: {
								required: true,
								regex: '#/regex/hgnc_gene',
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Gene Targets (HGNC)',
							examples: ['HGNC:3236', 'HGNC:11998'],
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_biospecimen_id', 'file_name'],
					foreignKey: [
						{
							schema: 'biospecimen',
							mappings: [
								{
									local: 'submitter_biospecimen_id',
									foreign: 'submitter_biospecimen_id',
								},
							],
						},
					],
				},
			},
			{
				name: 'follow_up',
				description:
					'Longitudinal follow-up assessments recorded after the initial diagnosis and treatment. A compound unique key across participant and visit number prevents duplicate entries per visit.',
				meta: {
					category: 'Clinical',
				},
				fields: [
					{
						name: 'submitter_participant_id',
						description: 'Reference to the participant this follow-up record belongs to.',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Participant ID',
						},
					},
					{
						name: 'submitter_follow_up_id',
						description: 'Unique identifier for this follow-up event.',
						valueType: 'string',
						unique: true,
						restrictions: {
							required: true,
							regex: '#/regex/id_format',
						},
						meta: {
							displayName: 'Submitter Follow-Up ID',
							examples: ['FU-001', 'PCGL-FU-12'],
						},
					},
					{
						name: 'visit_number',
						description: 'Sequential visit number for this follow-up event.',
						valueType: 'integer',
						restrictions: {
							required: true,
							range: {
								min: 1,
							},
						},
						meta: {
							displayName: 'Visit Number',
						},
					},
					{
						name: 'follow_up_date',
						description: 'Date of the follow-up assessment (YYYY-MM-DD).',
						valueType: 'string',
						restrictions: {
							required: true,
							regex: '#/regex/date_format',
						},
						meta: {
							displayName: 'Follow-Up Date',
							examples: ['2022-09-01'],
						},
					},
					{
						name: 'disease_status',
						description: 'Disease status observed at this follow-up visit.',
						valueType: 'string',
						restrictions: {
							required: true,
							codeList: [
								'Complete Remission',
								'Partial Remission',
								'Stable',
								'Relapse or Recurrence',
								'Progression',
								'No Evidence of Disease',
								'Unknown',
								'Not assessed',
							],
						},
						meta: {
							displayName: 'Disease Status at Follow-Up',
						},
					},
					{
						name: 'relapse_type',
						description: "Type of relapse or recurrence if disease_status is 'Relapse or Recurrence'.",
						valueType: 'string',
						restrictions: {
							if: {
								conditions: [
									{
										fields: ['disease_status'],
										match: {
											value: 'Relapse or Recurrence',
										},
									},
								],
							},
							then: {
								required: true,
								codeList: [
									'Local Recurrence',
									'Distant Recurrence',
									'Local and Distant Recurrence',
									'Second Primary',
									'Unknown',
								],
							},
							else: {
								empty: true,
							},
						},
						meta: {
							displayName: 'Relapse Type',
						},
					},
					{
						name: 'ecog_performance_status',
						description: 'ECOG performance status score at time of follow-up.',
						valueType: 'integer',
						restrictions: {
							range: {
								min: 0,
								max: 5,
							},
						},
						meta: {
							displayName: 'ECOG Performance Status',
							examples: [0, 1, 2],
						},
					},
				],
				restrictions: {
					uniqueKey: ['submitter_participant_id', 'visit_number'],
					foreignKey: [
						{
							schema: 'participant',
							mappings: [
								{
									local: 'submitter_participant_id',
									foreign: 'submitter_participant_id',
								},
							],
						},
					],
				},
			},
		],
	},

	null,
	2,
);

type ParseResult =
	/** JSON is valid and matches the Lectern schema exactly */
	| { status: 'valid'; dictionary: unknown }
	/** JSON is parseable but has schema warnings — preview still renders */
	| { status: 'warning'; dictionary: unknown; warnings: string[] }
	/** JSON syntax error — cannot render anything */
	| { status: 'error'; errors: string[] };

function parseDictionary(text: string): ParseResult {
	let json: unknown;
	try {
		json = JSON.parse(text);
	} catch (e) {
		return {
			status: 'error',
			errors: [`JSON syntax error: ${e instanceof Error ? e.message : String(e)}`],
		};
	}

	const result = Dictionary.safeParse(json);
	if (result.success) {
		return { status: 'valid', dictionary: result.data };
	}

	// Zod found schema issues — warn but still allow preview using the raw JSON
	const warnings = result.error.errors.map((issue: { path: (string | number)[]; message: string }) => {
		const path = issue.path.length > 0 ? issue.path.join('.') + ': ' : '';
		return `${path}${issue.message}`;
	});
	return { status: 'warning', dictionary: json, warnings };
}

// The DictionaryStateProvider initialises with ['Required'] as the active filter,
// which hides all non-required fields. This component resets it on mount.
const FilterResetter = (): null => {
	const { setFilters } = useDictionaryTableState();
	useEffect(() => {
		setFilters([]);
	}, []);
	return null;
};

interface PublishState {
	status: 'idle' | 'loading' | 'success' | 'error';
	message?: string;
}

interface DictionaryPlaygroundProps {
	lecternUrl?: string;
}

export const DictionaryPlayground = ({ lecternUrl }: DictionaryPlaygroundProps): ReactElement => {
	const stageTheme = useStageTheme();
	const lecternTheme = createLecternTheme(stageTheme);

	// // Scale typography down for the compact split-pane preview — the shared
	// // theme targets the full-page dictionary viewer where 30px headings make sense.
	// const lecternTheme = {
	// 	...baseLecternTheme,
	// 	typography: {
	// 		...baseLecternTheme.typography,
	// 		subtitleBold: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 18px;
	// 			font-weight: bold;
	// 			line-height: 100%;
	// 		`,
	// 		subtitleSecondary: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 15px;
	// 			font-weight: 700;
	// 			line-height: 130%;
	// 		`,
	// 		headingSmall: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 15px;
	// 			font-weight: bold;
	// 			line-height: 120%;
	// 		`,
	// 		paragraph: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			line-height: 150%;
	// 		`,
	// 		paragraphBold: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			font-weight: bold;
	// 			line-height: 130%;
	// 		`,
	// 		paragraphSmall: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 12px;
	// 			line-height: 140%;
	// 		`,
	// 		paragraphSmallBold: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			font-weight: bold;
	// 			line-height: 140%;
	// 		`,
	// 		body: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			line-height: 150%;
	// 		`,
	// 		bodyBold: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			font-weight: bold;
	// 			line-height: 150%;
	// 		`,
	// 		tableHeader: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			font-weight: bold;
	// 			line-height: 100%;
	// 		`,
	// 		buttonText: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 13px;
	// 			line-height: 1.5;
	// 			vertical-align: middle;
	// 		`,
	// 		fieldBlock: css`
	// 			font-family: var(--stage-font-base, 'Lato', sans-serif);
	// 			font-size: 12px;
	// 			line-height: 100%;
	// 			text-align: center;
	// 			vertical-align: middle;
	// 		`,
	// 	},
	// };

	const [editorValue, setEditorValue] = useState(STARTER_TEMPLATE);
	const [parseResult, setParseResult] = useState<ParseResult>(() => parseDictionary(STARTER_TEMPLATE));
	const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
	const [previewKey, setPreviewKey] = useState(0);
	const [splitPct, setSplitPct] = useState(42);
	const splitContainerRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const onDragStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		isDragging.current = true;

		document.body.style.userSelect = 'none';
		document.body.style.cursor = 'col-resize';

		const onMouseMove = (ev: MouseEvent) => {
			if (!isDragging.current || !splitContainerRef.current) return;
			const rect = splitContainerRef.current.getBoundingClientRect();
			const pct = ((ev.clientX - rect.left) / rect.width) * 100;
			setSplitPct(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)));
		};

		const onMouseUp = () => {
			isDragging.current = false;
			document.body.style.userSelect = '';
			document.body.style.cursor = '';
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}, []);

	// Increment key each time we get a renderable dictionary so the preview remounts and bounces
	useEffect(() => {
		if (parseResult.status !== 'error') {
			setPreviewKey((k) => k + 1);
		}
	}, [parseResult]);

	const handleFormat = useCallback(() => {
		try {
			const formatted = JSON.stringify(JSON.parse(editorValue), null, 2);
			setEditorValue(formatted);
			setParseResult(parseDictionary(formatted));
		} catch {
			// not valid JSON — nothing to format
		}
	}, [editorValue]);

	const handleReset = useCallback(() => {
		setEditorValue(STARTER_TEMPLATE);
		setParseResult(parseDictionary(STARTER_TEMPLATE));
		setPublishState({ status: 'idle' });
	}, []);

	const handleLoadDemo = useCallback(() => {
		setEditorValue(DEMO_TEMPLATE);
		setParseResult(parseDictionary(DEMO_TEMPLATE));
		setPublishState({ status: 'idle' });
	}, []);

	const handleEditorChange = useCallback((value: string) => {
		setEditorValue(value);
		setPublishState({ status: 'idle' });
		if (debounceTimer.current) clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => {
			setParseResult(parseDictionary(value));
		}, 600);
	}, []);

	const handlePublish = useCallback(async () => {
		if (!lecternUrl || parseResult.status === 'error') return;
		setPublishState({ status: 'loading' });
		try {
			const response = await fetch(`${lecternUrl}/dictionaries`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify('dictionary' in parseResult ? parseResult.dictionary : null),
			});
			if (!response.ok) {
				const body = await response.text();
				setPublishState({ status: 'error', message: `Lectern returned ${response.status}: ${body}` });
				return;
			}
			const data = await response.json();
			setPublishState({
				status: 'success',
				message: `Published — dictionary ID: ${data._id || data.id}. View it at /dictionary.`,
			});
		} catch (e) {
			setPublishState({
				status: 'error',
				message: `Could not reach Lectern at ${lecternUrl}. Is it running?`,
			});
		}
	}, [lecternUrl, parseResult]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const renderableDictionary: any = parseResult.status !== 'error' ? parseResult.dictionary : null;

	return (
		<div
			css={css`
				display: flex;
				flex-direction: column;
				position: fixed;
				top: 50px; /* navbar height */
				left: 0;
				right: 0;
				bottom: 0;
				overflow: auto;
				-webkit-overflow-scrolling: touch;
				overscroll-behavior: auto;
			`}
		>
			{/* Header */}
			<div
				css={css`
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px 24px;
					border-bottom: 1px solid #e0e0e0;
					background: #f8f9fa;
					flex-shrink: 0;
				`}
			>
				<div>
					<h1
						css={css`
							margin: 0;
							font-size: 16px;
							font-weight: 600;
							color: #1a1a2e;
						`}
					>
						Dictionary Playground
					</h1>
					<p
						css={css`
							margin: 2px 0 0;
							font-size: 11px;
							color: #666;
						`}
					>
						Edit your Lectern schema on the left and see it rendered live on the right. For more information on Lectern
						schema see{'  '}
						<a
							href="https://docs.overture.bio/docs/core-software/Lectern/dictionaryReference"
							target="_blank"
							rel="noopener noreferrer"
							css={css`
								color: #0c3547;
								text-decoration: underline;
								&:hover {
									color: #1565c0;
								}
							`}
						>
							building data dictionaries
						</a>
					</p>
				</div>

				<div
					css={css`
						display: flex;
						gap: 8px;
						align-items: center;
					`}
				>
					{lecternUrl && (
						<button
							onClick={handlePublish}
							disabled={parseResult.status === 'error' || publishState.status === 'loading'}
							css={css`
								padding: 6px 14px;
								font-size: 12px;
								font-weight: 500;
								border-radius: 4px;
								border: 0.5px solid #0c3547;
								background: #0c3547;
								color: #fff;
								cursor: pointer;
								opacity: ${parseResult.status === 'error' || publishState.status === 'loading' ? 0.5 : 1};
								&:hover:not(:disabled) {
									background: #0a2c3d;
								}
							`}
						>
							{publishState.status === 'loading' ? 'Publishing...' : 'Publish to Lectern'}
						</button>
					)}
				</div>
			</div>

			{/* Publish feedback */}
			{publishState.status !== 'idle' && (
				<div
					css={css`
						padding: 6px 24px;
						font-size: 12px;
						background: ${publishState.status === 'success'
							? '#e8f5e9'
							: publishState.status === 'error'
								? '#fdecea'
								: '#e3f2fd'};
						color: ${publishState.status === 'success'
							? '#2e7d32'
							: publishState.status === 'error'
								? '#c62828'
								: '#1565c0'};
						border-bottom: 1px solid #e0e0e0;
						flex-shrink: 0;
					`}
				>
					{publishState.message}
				</div>
			)}

			{/* Split pane */}
			<div
				ref={splitContainerRef}
				css={css`
					display: flex;
					flex: 1;
					overflow: hidden;
					min-height: 0;
				`}
			>
				{/* Editor panel */}
				<div
					css={css`
						width: ${splitPct}%;
						min-width: 0;
						/* Grid rows: toolbar / validation strip / editor */
						display: grid;
						grid-template-rows: auto auto 1fr;
						overflow: hidden;
					`}
				>
					{/* Editor toolbar — grid row 1 */}
					<div
						css={css`
							display: flex;
							align-items: center;
							justify-content: space-between;
							padding: 6px 10px;
							border-bottom: 1px solid #e0e0e0;
							background: #f0f4f8;
						`}
					>
						<span
							css={css`
								font-size: 11px;
								font-weight: 600;
								text-transform: uppercase;
								letter-spacing: 0.5px;
								color: #555;
							`}
						>
							Schema Editor
						</span>
						<div
							css={css`
								display: flex;
								gap: 4px;
							`}
						>
							{[
								{ label: 'Format', onClick: handleFormat },
								{ label: 'Reset', onClick: handleReset },
								{ label: 'Load Demo', onClick: handleLoadDemo },
							].map(({ label, onClick }) => (
								<button
									key={label}
									onClick={onClick}
									css={css`
										padding: 2px 8px;
										font-size: 11px;
										border-radius: 3px;
										border: 0.5px solid #b0bec5;
										background: #fff;
										color: #546e7a;
										cursor: pointer;
										&:hover {
											background: #eceff1;
											color: #37474f;
										}
									`}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Validation status — grid row 2, always visible above the editor */}
					<div
						css={css`
							min-height: 26px;
							max-height: 100px;
							overflow-y: auto;
							border-bottom: 2px solid
								${parseResult.status === 'valid' ? '#2e7d32' : parseResult.status === 'warning' ? '#b45309' : '#c62828'};
							background: ${parseResult.status === 'valid'
								? '#f1f8f1'
								: parseResult.status === 'warning'
									? '#fffbeb'
									: '#fff0f0'};
							-webkit-overflow-scrolling: touch;
						`}
					>
						{parseResult.status === 'valid' ? (
							<div
								css={css`
									padding: 4px 12px;
									font-size: 11px;
									font-weight: 600;
									color: #2e7d32;
								`}
							>
								Valid Lectern dictionary
							</div>
						) : parseResult.status === 'warning' ? (
							<div
								css={css`
									padding: 4px 12px;
								`}
							>
								{parseResult.warnings.map((w: string, i: number) => (
									<div
										key={i}
										css={css`
											font-family: monospace;
											font-size: 11px;
											font-weight: 600;
											color: #b45309;
											line-height: 1.5;
											padding: 1px 0;
										`}
									>
										{w}
									</div>
								))}
							</div>
						) : (
							<div
								css={css`
									padding: 4px 12px;
								`}
							>
								{parseResult.errors.map((err: string, i: number) => (
									<div
										key={i}
										css={css`
											font-family: monospace;
											font-size: 11px;
											font-weight: 600;
											color: #c62828;
											line-height: 1.5;
											padding: 1px 0;
										`}
									>
										{err}
									</div>
								))}
							</div>
						)}
					</div>

					{/* CodeMirror editor — grid row 3 (1fr) */}
					<div
						css={css`
							overflow: hidden;
							min-height: 0;
							display: flex;
							flex-direction: column;
							& .cm-editor {
								height: 100%;
								font-size: 13px;
							}
							& .cm-scroller {
								overflow: auto;
								-webkit-overflow-scrolling: touch;
							}
						`}
					>
						<ReactCodeMirror
							value={editorValue}
							onChange={handleEditorChange}
							extensions={[json()]}
							theme={oneDark}
							height="100%"
							style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
							basicSetup={{ lineNumbers: true, foldGutter: true, tabSize: 2 }}
						/>
					</div>
				</div>

				{/* Drag handle */}
				<div
					onMouseDown={onDragStart}
					onDoubleClick={() => setSplitPct(42)}
					title="Drag to resize · Double-click to reset"
					css={css`
						width: 8px;
						flex-shrink: 0;
						background: #e8ecef;
						cursor: col-resize;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: background 0.15s;
						&:hover {
							background: #d0d8e0;
						}
						&:hover > span,
						&:active > span {
							opacity: 1;
						}
					`}
				>
					<span
						css={css`
							display: flex;
							flex-direction: column;
							gap: 3px;
							opacity: 0.4;
							transition: opacity 0.15s;
							pointer-events: none;
						`}
					>
						{Array.from({ length: 5 }).map((_, i) => (
							<span
								key={i}
								css={css`
									display: block;
									width: 3px;
									height: 3px;
									border-radius: 50%;
									background: #546e7a;
								`}
							/>
						))}
					</span>
				</div>

				{/* Preview panel */}
				<div
					css={css`
						flex: 1;
						overflow-y: auto;
						background: #fff;
						display: flex;
						flex-direction: column;
						min-height: 0;
						-webkit-overflow-scrolling: touch;
						overscroll-behavior: contain;
					`}
				>
					<div
						css={css`
							padding: 8px 12px;
							border-bottom: 1px solid #e0e0e0;
							background: #f0f4f8;
							font-size: 11px;
							font-weight: 600;
							text-transform: uppercase;
							letter-spacing: 0.5px;
							color: #555;
							flex-shrink: 0;
						`}
					>
						Live Preview
					</div>

					{renderableDictionary ? (
						<div
							key={previewKey}
							css={css`
								padding: 0 20px 24px;
								@keyframes preview-bounce {
									0% {
										transform: translateY(-8px);
										opacity: 0.5;
									}
									55% {
										transform: translateY(3px);
										opacity: 1;
									}
									75% {
										transform: translateY(-2px);
									}
									90% {
										transform: translateY(1px);
									}
									100% {
										transform: translateY(0);
									}
								}
								animation: preview-bounce 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
							`}
						>
							<ThemeProvider theme={lecternTheme}>
								<DictionaryStaticDataProvider staticDictionaries={[renderableDictionary]}>
									<DictionaryTableStateProvider>
										<FilterResetter />
										<DictionaryTableViewer />
									</DictionaryTableStateProvider>
								</DictionaryStaticDataProvider>
							</ThemeProvider>
						</div>
					) : (
						<div
							css={css`
								display: flex;
								align-items: center;
								justify-content: center;
								flex: 1;
								color: #999;
								font-size: 14px;
							`}
						>
							Fix the schema errors on the left to see a preview.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
