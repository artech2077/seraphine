"use client"

import * as React from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
} from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import {
  Menubar,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
  MenubarItem,
  MenubarContent,
} from "@/components/ui/menubar"
import { NativeSelect } from "@/components/ui/native-select"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Toaster } from "@/components/ui/sonner"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { SelectLabel } from "@/components/ui/select"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import {
  BellIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  MousePointerClickIcon,
  StarIcon,
} from "lucide-react"

const chartData = [
  { name: "Jan", users: 120, sessions: 80 },
  { name: "Feb", users: 200, sessions: 140 },
  { name: "Mar", users: 180, sessions: 130 },
]

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js"]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="font-semibold">{title}</div>
      <div className="border border-dashed rounded-lg p-4 space-y-3">
        {children}
      </div>
    </section>
  )
}

export function UiGallery() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [collapsibleOpen, setCollapsibleOpen] = React.useState(true)
  type TableSortState = "default" | "asc" | "desc"
  type TableSortKey = "name" | "status" | "role"

  const [tableSortKey, setTableSortKey] = React.useState<TableSortKey | null>(
    null
  )
  const [tableSortState, setTableSortState] =
    React.useState<TableSortState>("default")

  const tableRows = React.useMemo(
    () => [
      { name: "Alex", status: "Active", role: "Admin", variant: "default" },
      { name: "Jamie", status: "Invited", role: "Editor", variant: "secondary" },
      { name: "Morgan", status: "Active", role: "Viewer", variant: "default" },
    ],
    []
  )

  const sortedTableRows = React.useMemo(() => {
    const next = [...tableRows]
    if (tableSortState === "default" || !tableSortKey) {
      return next.reverse()
    }
    next.sort((a, b) => {
      let result = 0
      switch (tableSortKey) {
        case "status":
          result = a.status.localeCompare(b.status, "fr")
          break
        case "role":
          result = a.role.localeCompare(b.role, "fr")
          break
        case "name":
        default:
          result = a.name.localeCompare(b.name, "fr")
      }
      return tableSortState === "asc" ? result : -result
    })
    return next
  }, [tableRows, tableSortKey, tableSortState])

  function handleTableSort(nextKey: TableSortKey) {
    if (tableSortKey !== nextKey) {
      setTableSortKey(nextKey)
      setTableSortState("asc")
      return
    }
    if (tableSortState === "asc") {
      setTableSortState("desc")
      return
    }
    if (tableSortState === "desc") {
      setTableSortState("default")
      setTableSortKey(null)
      return
    }
    setTableSortState("asc")
  }

  return (
    <div className="space-y-8 p-6">
      <Section title="Buttons & Groups">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <ButtonGroup>
          <Button>Left</Button>
          <Button>Middle</Button>
          <Button>Right</Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroupText>Label</ButtonGroupText>
          <Button variant="secondary">Action</Button>
          <ButtonGroupSeparator />
          <Button variant="ghost">More</Button>
        </ButtonGroup>
      </Section>

      <Section title="Status & Typography">
        <div className="flex flex-wrap gap-2">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <span className="text-sm text-muted-foreground">
            Keyboard hint with Kbd
          </span>
        </div>
      </Section>

      <Section title="Accordion & Collapsible">
        <Accordion defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger>First item</AccordionTrigger>
            <AccordionContent>
              Content inside the first accordion panel.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Second item</AccordionTrigger>
            <AccordionContent>More copy goes here.</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
          <CollapsibleTrigger className="rounded-lg border px-3 py-2 text-sm">
            {collapsibleOpen ? "Hide" : "Show"} details
          </CollapsibleTrigger>
          <CollapsibleContent className="text-sm text-muted-foreground">
            Collapsible content controlled by internal state.
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Alerts & Dialogs">
        <Alert className="max-w-lg">
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>Something informative lives here.</AlertDescription>
        </Alert>
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong.</AlertDescription>
        </Alert>
        <AlertDialog>
          <AlertDialogTrigger className="rounded-lg border px-3 py-1.5 text-sm">
            Open Alert Dialog
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="rounded-lg border px-3 py-1.5 text-sm">
            Open Dialog
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Dialog body copy.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger className="rounded-lg border px-3 py-1.5 text-sm">
            Open Drawer
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Drawer</DrawerTitle>
              <DrawerDescription>Slide-out panel content.</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button onClick={() => setDrawerOpen(false)}>Close</Button>
              <DrawerClose className="rounded-lg border px-3 py-1.5 text-sm">
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
        <Sheet>
          <SheetTrigger className="rounded-lg border px-3 py-1.5 text-sm">
            Open Sheet
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet panel</SheetTitle>
              <SheetDescription>Base UI sheet content.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Section>

      <Section title="Navigation & Menus">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Library</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Data</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-lg border px-3 py-1.5 text-sm">
            Dropdown Menu
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Options</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ContextMenu>
          <ContextMenuTrigger className="border rounded-md px-3 py-2 text-sm">
            Right click me
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Copy</ContextMenuItem>
            <ContextMenuItem>Paste</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Delete</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New Tab</MenubarItem>
              <MenubarItem>New Window</MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Copy Link</MenubarItem>
                  <MenubarItem>Invite</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
              <NavigationMenuLink href="#" className="block rounded-md border p-3 text-sm">
                Explore products
              </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#" className="rounded-md border px-3 py-2 text-sm">
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="text-sm text-muted-foreground">
            Account tab content.
          </TabsContent>
          <TabsContent value="billing" className="text-sm text-muted-foreground">
            Billing tab content.
          </TabsContent>
        </Tabs>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCommandOpen(true)}
        >
          Open Command Palette
        </Button>
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <Command>
            <CommandInput placeholder="Type a command..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>Profile</CommandItem>
                <CommandItem>Billing</CommandItem>
                <CommandItem>Settings</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </Section>

      <Section title="Forms & Inputs">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="input-basic">Input</FieldLabel>
            <Input id="input-basic" placeholder="Type here" />
          </Field>
          <Field>
            <FieldLabel htmlFor="textarea-basic">Textarea</FieldLabel>
            <Textarea id="textarea-basic" placeholder="Multiline text" />
          </Field>
          <Field>
            <FieldLabel htmlFor="input-group">Input Group</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput id="input-group" placeholder="username" />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" variant="ghost">
                  <CheckIcon className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="combobox-basic">Combobox</FieldLabel>
            <Combobox items={frameworks}>
              <ComboboxInput id="combobox-basic" placeholder="Select framework" showClear />
              <ComboboxContent>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <Field>
            <FieldLabel htmlFor="select-basic">Select</FieldLabel>
            <Select defaultValue={frameworks[0]}>
              <SelectTrigger id="select-basic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectLabel>Frameworks</SelectLabel>
                {frameworks.map((fw) => (
                  <SelectItem key={fw} value={fw}>
                    {fw}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="native-select">Native Select</FieldLabel>
            <NativeSelect id="native-select">
              <option>Option A</option>
              <option>Option B</option>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>Input OTP</FieldLabel>
            <InputOTP maxLength={4}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel>Checkbox</FieldLabel>
            <Checkbox defaultChecked />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel>Switch</FieldLabel>
            <Switch defaultChecked />
          </Field>
          <Field>
            <FieldLabel>Radio Group</FieldLabel>
            <RadioGroup defaultValue="a">
              <Label className="flex items-center gap-2">
                <RadioGroupItem value="a" />
                Option A
              </Label>
              <Label className="flex items-center gap-2">
                <RadioGroupItem value="b" />
                Option B
              </Label>
            </RadioGroup>
          </Field>
          <Field>
            <FieldLabel>Slider</FieldLabel>
            <Slider defaultValue={[25, 75]} />
          </Field>
          <Field>
            <FieldLabel>Toggle Group</FieldLabel>
            <ToggleGroup multiple defaultValue={["bold"]}>
              <ToggleGroupItem value="bold">B</ToggleGroupItem>
              <ToggleGroupItem value="italic">I</ToggleGroupItem>
              <ToggleGroupItem value="underline">U</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field orientation="horizontal">
            <FieldLabel>Toggle</FieldLabel>
            <Toggle aria-label="Toggle star">
              <StarIcon className="size-4" />
            </Toggle>
          </Field>
        </FieldGroup>
      </Section>

      <Section title="Cards, Lists & Skeletons">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/vercel.png" alt="avatar" />
                <AvatarFallback>VC</AvatarFallback>
              </Avatar>
              <span className="text-sm">Avatar with fallback</span>
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-1/2" />
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Action</Button>
            <Button size="sm" variant="outline">
              Secondary
            </Button>
          </CardFooter>
        </Card>
        <ItemGroup>
          <Item>
            <ItemMedia variant="icon">
              <InfoIcon className="size-4" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>List item</ItemTitle>
              <ItemDescription>Small supporting text.</ItemDescription>
            </ItemContent>
          </Item>
          <Item>
            <ItemMedia variant="image">
              <img
                alt="thumb"
                src="https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=200"
              />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Thumbnail</ItemTitle>
              <ItemDescription>Media + description layout.</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </Section>

      <Section title="Media & Layout">
        <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg border">
          <img
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800"
            alt="Landscape"
            className="h-full w-full object-cover"
          />
        </AspectRatio>
        <ScrollArea className="h-24 w-full rounded border">
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                Scroll line {i + 1}
              </p>
            ))}
          </div>
        </ScrollArea>
        <ResizablePanelGroup direction="horizontal" className="border rounded-lg">
          <ResizablePanel defaultSize={50} className="p-3 text-sm">
            Resizable left
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} className="p-3 text-sm">
            Resizable right
          </ResizablePanel>
        </ResizablePanelGroup>
      </Section>

      <Section title="Data Display">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <SortableTableHead
                label="Name"
                sortKey="name"
                activeSortKey={tableSortKey ?? undefined}
                sortState={tableSortState}
                onSort={() => handleTableSort("name")}
              />
              <SortableTableHead
                label="Status"
                sortKey="status"
                activeSortKey={tableSortKey ?? undefined}
                sortState={tableSortState}
                onSort={() => handleTableSort("status")}
              />
              <SortableTableHead
                label="Role"
                sortKey="role"
                activeSortKey={tableSortKey ?? undefined}
                sortState={tableSortState}
                onSort={() => handleTableSort("role")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTableRows.map((row) => (
              <TableRow key={`${row.name}-${row.role}`}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.variant as React.ComponentProps<typeof Badge>["variant"]}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell>{row.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableCaption>Simple table component</TableCaption>
        </Table>
        <Progress value={64} />
        <Spinner />
        <div className="flex items-center gap-3">
          <Switch defaultChecked />
          <Tooltip>
            <TooltipTrigger className="rounded-md border px-2.5 py-1 text-sm">
              Hover me
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
          <HoverCard>
            <HoverCardTrigger className="rounded-md border px-2.5 py-1 text-sm">
              Hover card
            </HoverCardTrigger>
            <HoverCardContent className="w-64">
              <div className="flex gap-3">
                <Avatar>
                  <AvatarFallback>HC</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Hover Card</p>
                  <p className="text-sm text-muted-foreground">
                    Rich preview content.
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
          <Popover>
            <PopoverTrigger className="rounded-md border px-2.5 py-1 text-sm">
              Popover
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <p className="text-sm">This is a popover panel.</p>
            </PopoverContent>
          </Popover>
        </div>
      </Section>

      <Section title="Picker, Tabs & Carousel">
        <Calendar className="rounded-lg border" />
        <Carousel className="w-full max-w-xl">
          <CarouselContent>
            {[1, 2, 3].map((num) => (
              <CarouselItem key={num} className="p-2">
                <div className="bg-muted rounded-lg border p-6 text-center text-sm">
                  Slide {num}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
        <Tabs defaultValue="line">
          <TabsList>
            <TabsTrigger value="line">Line</TabsTrigger>
            <TabsTrigger value="bar">Bar</TabsTrigger>
          </TabsList>
          <TabsContent value="line">
            <ChartContainer
              config={{
                users: { label: "Users", color: "hsl(210 100% 56%)" },
                sessions: { label: "Sessions", color: "hsl(150 70% 40%)" },
              }}
            >
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--color-sessions)"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </TabsContent>
          <TabsContent value="bar">
            <ChartContainer
              config={{
                users: { label: "Users", color: "hsl(210 100% 56%)" },
                sessions: { label: "Sessions", color: "hsl(150 70% 40%)" },
              }}
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="users" fill="var(--color-users)" radius={4} />
                <Bar dataKey="sessions" fill="var(--color-sessions)" radius={4} />
              </BarChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Utility Components">
        <Separator />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MousePointerClickIcon className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              Use the empty state component for placeholders.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => toast.success("Success toast from Sonner")}
          >
            Show toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast("Neutral toast")}
          >
            Neutral toast
          </Button>
        </div>
      </Section>

      <Section title="Sidebar Layout">
        <SidebarProvider>
          <div className="flex w-full gap-4 rounded-lg border p-3">
            <Sidebar className="rounded-lg border" collapsible="none">
              <SidebarHeader className="p-3">Sidebar</SidebarHeader>
              <SidebarSeparator />
              <SidebarContent className="p-2">
                <SidebarGroup>
                  <SidebarGroupLabel>Menu</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton isActive>
                          <BookOpenIcon className="size-4" />
                          Overview
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton>
                          <StarIcon className="size-4" />
                          Favorites
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter className="p-2">
                <Button variant="outline" size="sm">
                  <BellIcon className="mr-1 size-4" />
                  Alerts
                </Button>
              </SidebarFooter>
            </Sidebar>
            <div className="flex-1 space-y-3">
              <SidebarTrigger />
              <p className="text-sm text-muted-foreground">
                Sidebar component shown alongside main content.
              </p>
            </div>
          </div>
        </SidebarProvider>
      </Section>

      <Toaster />
    </div>
  )
}
