# DPE List App

A React application for displaying and managing DPE (Diagnostic de Performance Énergétique) records with pagination and search functionality.

## Features

- **Paginated DPE List**: Display DPE records with configurable page sizes (10, 20, 50, 100)
- **Search Functionality**: Search through DPE records by various criteria
- **Sorting**: Sort by ID, DPE rating, address, handicap, note, or last modified date
- **DPE Rating Display**: Color-coded DPE ratings (A-G) with visual tags
- **Top Menu Integration**: Uses the shared top-menu component
- **Responsive Design**: Built with Ant Design components
- **Dynamic Content**: Displays title, subtitle, and detailed text from API response

## API Integration

The app integrates with the DPE API endpoint:
- **Base URL**: `https://api-dev.etiquettedpe.fr/backoffice`
- **Endpoint**: `/dpe_list`
- **Authentication**: Uses `x-authorization: dperdition` header
- **Response Format**: Returns structured data with `table_values`, `table_columns`, and `meta.total_count`
- **Data Fields**: ID, DPE rating, address, handicap, note, last modified date

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Usage

1. Navigate to the app URL
2. Use the search bar to filter DPE records
3. Click column headers to sort data
4. Use pagination controls to navigate through results
5. Adjust page size using the page size selector
