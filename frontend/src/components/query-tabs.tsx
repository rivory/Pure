import { Tabs, Box } from "@radix-ui/themes";
import { QueryInterface } from "@/components/query-interface";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { model } from "../../wailsjs/go/models";

interface QueryState {
	queryText: string;
	results: {
		columns: string[];
		rows: (string | number | boolean | null)[][]
	} | null;
}

export interface Tab {
	id: string;
	title: string;
	queryState: QueryState;
}

interface QueryTabsProps {
	selectedConnection?: model.Connection;
	activeTab: string;
	onActiveTabChange: (tabId: string) => void;
	tabs: Tab[];
	onTabsChange: (tabs: Tab[]) => void;
	onAddTab?: () => void;
}

export function QueryTabs({
	selectedConnection,
	activeTab,
	onActiveTabChange,
	tabs,
	onTabsChange,
	onAddTab,
}: React.PropsWithChildren<QueryTabsProps>) {
	const addTab = () => {
		if (onAddTab) {
			onAddTab();
		} else {
			const newId = String(tabs.length + 1);
			const newTitle = `Query ${newId}`;
			onTabsChange([
				...tabs,
				{
					id: newId,
					title: newTitle,
					queryState: {
						queryText: "",
						results: null,
					},
				},
			]);
			onActiveTabChange(newId);
		}
	};

	const closeTab = (tabId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		if (tabs.length === 1) return;

		const newTabs = tabs.filter((tab) => tab.id !== tabId);
		onTabsChange(newTabs);

		if (tabId === activeTab) {
			onActiveTabChange(newTabs[newTabs.length - 1].id);
		}
	};

	const updateTabState = (tabId: string, newState: QueryState) => {
		onTabsChange(
			tabs.map((tab) =>
				tab.id === tabId ? { ...tab, queryState: newState } : tab,
			),
		);
	};

	return (
		<Tabs.Root value={activeTab} onValueChange={onActiveTabChange}>
			<Box className="flex items-center border-b">
				<Tabs.List className="flex-1 flex overflow-x-auto whitespace-nowrap scrollbar-none">
					{tabs.map((tab) => (
						<Tabs.Trigger
							key={tab.id}
							value={tab.id}
							className="group relative"
						>
							<span className="dark:text-white">{tab.title}</span>
							{tabs.length > 1 && (
								<Button
									variant="ghost"
									size="sm"
									className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
									onClick={(e) => closeTab(tab.id, e)}
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</Tabs.Trigger>
					))}
				</Tabs.List>
				<Button variant="ghost" size="sm" className="mx-2" onClick={addTab}>
					<Plus className="h-4 w-4 dark:text-white" />
				</Button>
			</Box>

			{tabs.map((tab) => (
				<Tabs.Content key={tab.id} value={tab.id}>
					<QueryInterface
						selectedConnection={selectedConnection}
						initialState={tab.queryState}
						onStateChange={(newState) => updateTabState(tab.id, newState)}
					/>
				</Tabs.Content>
			))}
		</Tabs.Root>
	);
}
