/*
 *
 * Copyright (c) 2023 The Ontario Institute for Cancer Research. All rights reserved
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

import { Values } from '@/global/utils/typeUtils';
import { findIndex } from 'lodash';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

// keys must be unique, names can be re-used

export const RepositoryTabKeys = {
	FILES: 'files',
	JBROWSE_CIRCULAR: 'jbrowseCircular',
	JBROWSE_LINEAR: 'jbrowseLinear',
} as const;
export type RepositoryTabKey = Values<typeof RepositoryTabKeys>;

export const RepositoryTabNames = {
	FILES: 'Files',
	GENOME_VIEWER: 'Genome Viewer',
};
export type RepositoryTabName = Values<typeof RepositoryTabNames>;

export type RepositoryTabRecord = {
	name: RepositoryTabName;
	key: RepositoryTabKey;
	canClose: boolean;
};

export interface RepositoryTabsContextInterface {
	activeTab?: RepositoryTabKey;
	handleSwitchTab: (tabKey?: RepositoryTabKey) => void;
	handleCloseTab: (tabKey?: RepositoryTabKey) => void;
	handleOpenTab: (tab: RepositoryTabRecord) => void;
	handleUpdateTab: (tabKey?: RepositoryTabKey, updateObject?: Partial<RepositoryTabRecord>) => void;
	openTabs: RepositoryTabRecord[];
}

export const RepositoryTabsContext = createContext<RepositoryTabsContextInterface>({
	openTabs: [],
	handleSwitchTab: () => {},
	handleCloseTab: () => {},
	handleOpenTab: () => {},
	handleUpdateTab: () => {},
});

export const RepositoryTabsContextProvider = ({
	defaultTabs = [{ name: RepositoryTabNames.FILES, canClose: false, key: RepositoryTabKeys.FILES }],
	children,
}: PropsWithChildren<{
	defaultTabs?: RepositoryTabRecord[];
}>) => {
	const [openTabs, setOpenTabs] = useState<RepositoryTabRecord[]>(defaultTabs);
	const [activeTab, setActiveTab] = useState<RepositoryTabKey | undefined>(defaultTabs[0]?.key);

	const handleOpenTab = (tab?: RepositoryTabRecord) => {
		if (tab) {
			setOpenTabs(openTabs.concat(tab));
			setActiveTab(tab.key);
		}
	};

	const handleCloseTab = (tabKey?: RepositoryTabKey) => {
		// if removed tab was active, set active tab to previous tab in the list
		if (tabKey) {
			if (activeTab === tabKey) {
				const nextActiveTab = openTabs[findIndex(openTabs, (i) => i.key === tabKey) - 1 || 0]?.key;
				handleSwitchTab(nextActiveTab);
			}
			const nextOpenTabs = openTabs.filter((openTab) => openTab.key !== tabKey);
			setOpenTabs(nextOpenTabs);
		}
	};

	const handleUpdateTab = (
		tabKey?: RepositoryTabKey,
		updateObject?: Partial<RepositoryTabRecord>,
	) => {
		if (tabKey && updateObject) {
			const nextOpenTabs = openTabs.map((tab) =>
				tab.key === tabKey ? { ...tab, ...updateObject } : tab,
			);
			setOpenTabs(nextOpenTabs);
		}
	};

	const handleSwitchTab = (tabKey?: RepositoryTabKey) => {
		tabKey && setActiveTab(tabKey);
	};

	const contextValues = {
		activeTab,
		handleSwitchTab,
		handleCloseTab,
		handleOpenTab,
		handleUpdateTab,
		openTabs,
	};

	return (
		<RepositoryTabsContext.Provider value={contextValues}>
			{children}
		</RepositoryTabsContext.Provider>
	);
};

export const useRepositoryTabsContext = (): RepositoryTabsContextInterface =>
	useContext(RepositoryTabsContext);
