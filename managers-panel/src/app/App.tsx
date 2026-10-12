import { QueryProvider } from '@/app/providers/QueryProvider';
import { MessengerPage } from '@/pages/messenger';

function App() {
    return (
        <QueryProvider>
            <MessengerPage />
        </QueryProvider>
    );
}

export default App;