import { Tabs, Box } from "@radix-ui/themes"
import { QueryInterface } from "@/components/query-interface"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface QueryState {
  queryText: string
  results: {
    columns: string[]
    rows: any[][]
  } | null
}

interface Tab {
  id: string
  title: string
  queryState: QueryState
}

interface QueryTabsProps {
  selectedConnection?: string
}

export function QueryTabs({ selectedConnection }: QueryTabsProps) {
  const [tabs, setTabs] = useState<Tab[]>([
    { 
      id: "1", 
      title: "Query 1",
      queryState: {
        queryText: "",
        results: null
      }
    }
  ])
  const [activeTab, setActiveTab] = useState("1")

  const addTab = () => {
    const newId = String(tabs.length + 1)
    setTabs([...tabs, { 
      id: newId, 
      title: "Query " + newId,
      queryState: {
        queryText: "",
        results: null
      }
    }])
    setActiveTab(newId)
  }

  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (tabs.length === 1) return

    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    if (tabId === activeTab) {
      setActiveTab(newTabs[newTabs.length - 1].id)
    }
  }

  const updateTabState = (tabId: string, newState: QueryState) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, queryState: newState }
        : tab
    ))
  }
  console.log("tabs", tabs)
  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <Box className="flex items-center border-b">
        <Tabs.List className="flex-1">
          {tabs.map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className="group relative"
            >
              {tab.title}
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
        <Button
          variant="ghost"
          size="sm"
          className="mx-2"
          onClick={addTab}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </Box>

      {tabs.map(tab => (
        <Tabs.Content key={tab.id} value={tab.id}>
          <QueryInterface 
            selectedConnection={selectedConnection}
            initialState={tab.queryState}
            onStateChange={(newState) => updateTabState(tab.id, newState)}
          />
        </Tabs.Content>
      ))}
    </Tabs.Root>
  )
} 