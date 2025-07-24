import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RecognitionForm } from '@/components/recognition/RecognitionForm';
import { useTranslation } from 'react-i18next';
import SocialLayout from '@/layouts/SocialLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Award, Gift, Send, Star, ThumbsUp, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// Define recognition badge icons
const badgeIcons: Record<string, JSX.Element> = {
  excellence: <Trophy className="h-5 w-5 text-yellow-500" />,
  teamwork: <ThumbsUp className="h-5 w-5 text-blue-500" />,
  innovation: <Star className="h-5 w-5 text-purple-500" />,
  goal: <Gift className="h-5 w-5 text-green-500" />,
  leadership: <Award className="h-5 w-5 text-red-500" />,
};

// Recognition card component
function RecognitionCard({ recognition }: { recognition: any }) {
  const { t } = useTranslation();
  const badgeIcon = badgeIcons[recognition.badgeType] || (
    <Star className="h-5 w-5" />
  );
  const timeAgo = formatDistanceToNow(new Date(recognition.createdAt), {
    addSuffix: true,
  });

  const isSent = !!recognition.recipient;
  const otherPerson = isSent ? recognition.recipient : recognition.recognizer;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={otherPerson?.avatarUrl} />
              <AvatarFallback>
                {otherPerson?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">
                {otherPerson?.name} {otherPerson?.surname}
              </h3>
              <p className="text-sm text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          <Badge className="flex items-center gap-1">
            {badgeIcon}
            {recognition.badgeType.charAt(0).toUpperCase() +
              recognition.badgeType.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-2">{recognition.message}</p>
        {recognition.points > 0 && (
          <Badge variant="outline" className="mt-2">
            {recognition.points} {t('app.points')}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecognitionPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('form');

  // Fetch sent recognitions
  const { data: sentRecognitions, isLoading: isLoadingSent } = useQuery({
    queryKey: ['/api/recognition/sent'],
    enabled: activeTab === 'sent',
  });

  // Fetch received recognitions
  const { data: receivedRecognitions, isLoading: isLoadingReceived } = useQuery(
    {
      queryKey: ['/api/recognition/received'],
      enabled: activeTab === 'received',
    }
  );

  const handleRecognitionSuccess = () => {
    // Switch to the sent tab after successfully sending a recognition
    setActiveTab('sent');
  };

  return (
    <SocialLayout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8 gap-2">
          <Send className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t('recognition.peerToPeer')}</h1>
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          <div className="md:col-span-7">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="form" className="flex-1">
                  {t('recognition.recognizeColleague')}
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex-1">
                  {t('recognition.sentRecognitions')}
                </TabsTrigger>
                <TabsTrigger value="received" className="flex-1">
                  {t('recognition.receivedRecognitions')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="mt-4">
                <RecognitionForm onSuccess={handleRecognitionSuccess} />
              </TabsContent>

              <TabsContent value="sent" className="mt-4">
                {isLoadingSent ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : sentRecognitions && sentRecognitions.length > 0 ? (
                  sentRecognitions.map((recognition: any) => (
                    <RecognitionCard
                      key={recognition.id}
                      recognition={recognition}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Send className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">
                        {t('recognition.noSentRecognitions')}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('recognition.recognizeColleaguesPrompt')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="received" className="mt-4">
                {isLoadingReceived ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : receivedRecognitions && receivedRecognitions.length > 0 ? (
                  receivedRecognitions.map((recognition: any) => (
                    <RecognitionCard
                      key={recognition.id}
                      recognition={recognition}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Star className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-1">
                        {t('recognition.noReceivedRecognitions')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('recognition.receivedRecognitionsDescription')}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="md:col-span-5">
            <Card>
              <CardHeader>
                <CardTitle>{t('recognition.peerToPeer')}</CardTitle>
                <CardDescription>
                  {t('recognition.peerToPeerDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium">
                        {t('recognition.appreciatePeers')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('recognition.appreciatePeersDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Gift className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium">
                        {t('recognition.sharePoints')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('recognition.sharePointsDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Star className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium">
                        {t('recognition.fosterTeamSpirit')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {t('recognition.fosterTeamSpiritDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SocialLayout>
  );
}
